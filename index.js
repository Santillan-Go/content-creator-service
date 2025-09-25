import express, { json, urlencoded } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./service/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_NAME,
//   api_key: process.env.CLOUDINARY_KEY,
//   api_secret: process.env.CLOUDINARY_SECRET,
// });
/*
TYPES, STRUCTURE

const modelProfile: {
  verify: true | false;
  name: string;
  bio: string;
  agency: string;
  profilePicture: string;
  coverPhoto: string;
  stats: {
    posts: number;
    videos: number;
    views: string;
  };
  posts: Post[];
} = {
  name: "Camila Hot",
  bio: "International Model | Victoria's Secret Angel | L'Oréal Paris Ambassador. Spreading positivity one post at a time.",
  agency: "IMG Models",
  profilePicture:
    "https://cdn.openart.ai/uploads/image_9YFkLViJ_1757401222855_raw.jpg",
  coverPhoto: "https://picsum.photos/1600/600",
  stats: {
    posts: 1240,
    videos: 150,
    views: "1.2B",
  },
  posts: Array.from({ length: 12 }, (_, i) => ({
    id: i,
    media: Array.from({ length: 3 + (i % 2) }, (__, j) => {
      const isVideo = (i + j) % 4 === 0; // or any rule you want

      const media: Media = isVideo
        ? {
            url: `https://assets.mixkit.co/videos/34562/34562-720.mp4`,
            type: "video",
            width: 1080,
            height: 1080,
            thumbnail: `https://picsum.photos/seed/${i * 4 + j + 1}/1080/1080`, // Placeholder thumbnail
          }
        : {
            url: `https://picsum.photos/seed/${i * 4 + j + 1}/1080/1080`,
            type: "image",
            width: 1080,
            height: 1080,
          };

      return media;
    }),
    caption: "Fashion shoot in Paris ✨",
    createdAt: new Date(2024, 0, i + 1).toISOString(),
    likes: Math.floor(Math.random() * 10000),
    comments: Math.floor(Math.random() * 1000),
    isCarousel: 3 + (i % 2) > 1,
    userId: 1,
    tags: ["fashion", "paris", "modeling"],
  })),
};

POST:
export interface Post {
  id: number;
  media: Media[];
  caption: string;
  createdAt: string;
  likes: number;
  comments: number;
  isCarousel: boolean;
  userId: number;
  tags: string[];
}

export type MediaType = "image" | "video";

export interface Media {
  url: string;
  type: MediaType;
  thumbnail?: string;
  width: number;
  height: number;
}

*/

// Routes
app.get("/", (req, res) => {
  /*
  EXAMPLES OF HOW TO USE FIREBASE
  await db.collection("library_books").doc(id_book).set({
      title,
      author,
      introduction,
      id: id_book,
      image,
    });

    await db.collection("transcript_books").doc(id_book).set({
      idBook: id_book,
      transcript,
    });
  */
  res.json({ message: "Welcome to Content Creator Service API" });
});

app.post("/create-user", async (req, res) => {
  try {
    const {
      verify,
      name,
      username,
      bio,
      profilePicture,
      coverPhoto,
      category,
    } = req.body;
    console.log(req.body);
    //HERE WE NEED TO STORE THE PROFILEPICTURE AND COVERPHOTO SOMEWHERE (CLOUDINARY)
    //MAKE SOME VALIDATION BY CHECKING IF ALL PROPERTIES ARE PRESENT
    if (
      !verify ||
      !name ||
      !bio ||
      !username ||
      !profilePicture ||
      !coverPhoto ||
      !category
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Generate a unique userId
    const userId = db.collection("users").doc().id;

    // Prepare the data
    const userData = {
      verify,
      name,
      username,
      bio,
      profilePicture,
      coverPhoto,
      category,
      stats: {
        posts: 0,
        videos: 0,
        views: 0,
        followers: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
    };

    // Store in Firestore
    await db.collection("users").doc(userId).set(userData);

    // Respond
    res.status(201).json({ message: "User created successfully", userId });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.delete("/delete-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    await db.collection("users").doc(userId).delete();
    //then also delete all posts by that user
    await db
      .collection("posts")
      .where("userId", "==", userId)
      .get()
      .then((querySnapshot) => {
        const batch = db.batch();
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-all-users", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const usersSnapshot = await db
      .collection("users")
      .where("username", "==", username)
      .get();
    if (usersSnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }
    res
      .status(200)
      .json({ id: usersSnapshot.docs[0].id, ...usersSnapshot.docs[0].data() });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/create-post", async (req, res) => {
  try {
    const { username, media, caption } = req.body;
    console.log({ username, media, caption });

    if (!username || !media || !Array.isArray(media) || media.length === 0) {
      return res.status(400).json({ error: "username and media are required" });
    }

    // 1. Find user by username
    const userQuery = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    // 2. Generate post ID
    const postId = db.collection("posts").doc().id;

    // 3. Build post object
    const postData = {
      postId,
      userId, // keep Firestore ID
      username, // also save username for easy queries
      media,
      caption: caption || "",
      tags: [],
      likes: 0,
      comments: 0,
      isCarousel: media.length > 1,
      createdAt: FieldValue.serverTimestamp(),
    };

    // 4. Save post
    await db.collection("posts").doc(postId).set(postData);

    // 5. Update stats
    await db
      .collection("users")
      .doc(userId)
      .update({
        "stats.posts": FieldValue.increment(1),
        "stats.videos": FieldValue.increment(
          media.filter((m) => m.type === "video").length
        ),
      });

    res.status(201).json({ message: "Post created successfully", postId });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users/:username/posts", async (req, res) => {
  try {
    const { username } = req.params;

    // Step 1: Find user by username
    const userSnapshot = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Step 2: Get posts by userId
    // const postsSnapshot = await db
    //   .collection("posts")
    //   .where("userId", "==", userId)
    //   .orderBy("createdAt", "desc") // optional: latest posts first
    //   .get();
    const postsSnapshot = await db
      .collection("posts")
      .where("userId", "==", userId)
      .get();

    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      // user: { id: userId, ...userDoc.data() },
      posts,
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// app.post("/create-post", async (req, res) => {
//   try {
//     const { username, media, caption } = req.body;
//     if (!username || !media || !Array.isArray(media) || media.length === 0) {
//       return res.status(400).json({ error: "username and media are required" });
//     }
//     // Validate user exists
//     const userDoc = await db
//       .collection("users")
//       .where("username", "==", username)
//       .get();
//     if (!userDoc.exists) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     //MEDIA SHOULD AN ARRAY OF OBJECTS WITH { url, type: 'image' | 'video', width, height, thumbnail? }
//     // Generate a unique postId
//     const postId = db.collection("posts").doc().id;
//     // Prepare post data
//     const postData = {
//       username,
//       media,
//       caption: caption || "",
//       tags: [],
//       likes: 0,
//       comments: 0,
//       isCarousel: media.length > 1,
//       createdAt: FieldValue.serverTimestamp(),
//     };
//     // Store in Firestore

//     await db.collection("posts").doc(postId).set(postData);
//     // Update user's post count
//     await db
//       .collection("users")
//       .doc(username)
//       .update({
//         "stats.posts": FieldValue.increment(1),
//         "stats.videos": FieldValue.increment(
//           media.filter((m) => m.type === "video").length
//         ),
//       });

//     // Respond
//     res.status(201).json({ message: "Post created successfully", postId });
//   } catch (error) {
//     console.error("Error creating post:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.put("/update-user/:userId", async (req, res) => {});

app.put("/update-post-likes/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { increment } = req.body; // Expecting { increment: true } or { increment: false }
    if (typeof increment !== "boolean") {
      return res
        .status(400)
        .json({ error: "Request body must contain { increment: boolean }" });
    }
    // Update post likes
    await db
      .collection("posts")
      .doc(postId)
      .update({
        likes: FieldValue.increment(increment ? 1 : -1),
      });
    res.status(200).json({ message: "Post likes updated successfully" });
  } catch (error) {
    console.error("Error updating post likes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
