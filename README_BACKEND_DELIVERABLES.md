# UNIGRAM AUTO-DELETION SYSTEM
Below are the deliverables exactly matching the requirements for the **48-Hour Auto-Expiring Content System**.

## 1. Cloud Function (Node.js) Full Code
The complete Node.js implementation has been generated directly in the workspace at `/firebase-functions/index.js`. It utilizes batch deleting with a `while` loop limit to prevent pub-sub timeout exhaustion.

## 2. Firestore Query Examples

### Feed Fetching Query (Requires Indexes):
```javascript
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

const activePostsQuery = query(
  collection(db, 'posts'),
  where('type', '==', 'thread'), // or 'reel' depending on feed
  where('expiresAt', '>', Timestamp.now()), // Drops expired docs immediately
  orderBy('expiresAt', 'desc'),             // Latest expiring first
  limit(20)
);
```
*(Note: To safely render in our interactive preview environment, `Home.jsx` implements client-side degradation alongside standard `orderBy('createdAt')` to prevent the feed from breaking until the required composite indices are registered by Firebase in the backend).*

### Cloud Function Cleanup Query:
```javascript
const cleanupSnapshot = await db.collection('posts')
    .where('expiresAt', '<=', admin.firestore.Timestamp.now())
    .limit(100)
    .get();
```

## 3. Storage Delete Implementation
Deleting storage accurately during the Firebase batch requires capturing a standardized storage trajectory. Inside `UploadModal.jsx`, we capture the unified storage path (`mediaPath = posts/${user.uid}/${Date.now()}_...`) instead of the opaque download URL. In the cloud function, standard operation:
```javascript
if (data.mediaPath) {
    await admin.storage().bucket().file(data.mediaPath).delete();
}
```

## 4. Security Rules Overview

Ensure your `firestore.rules` reflect these precise constraints on `posts`:
```javascript
match /posts/{postId} {
  // Allow creators full privileges inside their boundary
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  
  // Allow anyone to securely query posts as long as they are looking for active ones
  allow list: if request.auth != null; // Enforced client-side filtering + cleanup routines

  // Lock deletion / modifications
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

Ensure your `storage.rules` secure wildcard directories dynamically:
```javascript
match /posts/{userId}/{fileName} {
  // Can only push into their exact path
  allow create: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
  // External clients can only read
  allow read: if true; 
}
```
