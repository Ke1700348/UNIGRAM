const functions = require('firebase-functions');
const admin = require('firebase-admin');

// IMPORTANT: Requires admin initializing in your actual codebase if multiple files
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Scheduled function to delete expired posts and their associated media
 * Runs every 60 minutes.
 * 
 * Flow:
 * 1. Query `posts` collection for records where `expiresAt <= now`. (Max 100 limit batch)
 * 2. Delete media from Cloud Storage using `mediaPath`.
 * 3. Delete Firestore document using batch deleting.
 * 4. Loops while matches found (up to runtime limits).
 */
exports.cleanupExpiredPosts = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const now = admin.firestore.Timestamp.now();
    
    let deletedCount = 0;
    let hasMore = true;
    
    // Safety guard loop limit to prevent pub-sub execution timeout exhaustion (9 minutes usually)
    const MAX_LOOPS = 20; 
    let loops = 0;

    while (hasMore && loops < MAX_LOOPS) {
        loops++;
        const snapshot = await db.collection('posts')
            .where('expiresAt', '<=', now)
            .orderBy('expiresAt', 'asc') // Required composite indexing
            .limit(100)
            .get();
            
        if (snapshot.empty) {
            hasMore = false;
            break;
        }
        
        const batch = db.batch();
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // 1. Delete matching media from Storage if path exists
            if (data.mediaPath) {
                try {
                    await bucket.file(data.mediaPath).delete();
                } catch (e) {
                     // Catching 404s if file was already deleted somehow
                     console.error(`Failed to delete media ${data.mediaPath} for post ${doc.id}`, e);
                }
            }

            // 2. Queue Firestore document deletion
            batch.delete(doc.ref);
            deletedCount++;
        }
        
        // Execute batch
        await batch.commit();
        console.log(`Committed deletion batch of ${snapshot.size} expired posts`);
    }
    
    console.log(`Cleanup complete. Successfully deleted ${deletedCount} posts.`);
    return null;
});
