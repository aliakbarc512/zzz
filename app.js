
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
    getAuth, GoogleAuthProvider, signInWithPopup,
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore, doc, getDoc, setDoc, runTransaction,
    serverTimestamp, collection, addDoc, getDocs, query,
    where, updateDoc, onSnapshot, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    getMessaging,
    getToken
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCEenJ5RhwvWeOrsCTii4peRKwEX4gn5ec",
    authDomain: "x-cheema.firebaseapp.com",
    projectId: "x-cheema",
    storageBucket: "x-cheema.firebasestorage.app",
    messagingSenderId: "720516753668",
    appId: "1:720516753668:web:ba8f9ac8d95b6a16c04851",
    measurementId: "G-7ED3673XQV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);
const provider = new GoogleAuthProvider();

// SUPABASE
const SUPABASE_URL = "https://msjzdwuyowhphocjcvjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_vClu2_GRUURGYFsMFVtMxw_55ImzlDW";
const STATUS_API = SUPABASE_URL + "/functions/v1/status-media-api";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let stopRequestsListener = null;
let activeFriendUid = null;
let activeChatId = null;
let stopChatListener = null;
let chatReturnTo = "home";
let friendsLoadVersion = 0;

// HTML ELEMENTS
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginArea = document.getElementById("loginArea");
const profileArea = document.getElementById("profileArea");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userPhoto = document.getElementById("userPhoto");
const loginMessage = document.getElementById("loginMessage");

const newChatBtn = document.getElementById("newChatBtn");
const addFriendPage = document.getElementById("addFriendPage");
const homePage = document.getElementById("homePage");
const backHomeBtn = document.getElementById("backHomeBtn");

const friendsBtn = document.getElementById("friendsBtn");
const friendsPage = document.getElementById("friendsPage");
const backFriendsBtn = document.getElementById("backFriendsBtn");

// SETTINGS ELEMENTS
const settingsBtn = document.getElementById("settingsBtn");
const settingsPage = document.getElementById("settingsPage");
const backSettingsBtn = document.getElementById("backSettingsBtn");

const settingsPhoto = document.getElementById("settingsPhoto");
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const settingsPhotoInput = document.getElementById("settingsPhotoInput");
const changePhotoBtn = document.getElementById("changePhotoBtn");

const settingsDisplayName = document.getElementById("settingsDisplayName");
const settingsUsername = document.getElementById("settingsUsername");
const settingsBio = document.getElementById("settingsBio");

const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");
const settingsMessage = document.getElementById("settingsMessage");

const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
const notificationMessage = document.getElementById("notificationMessage");

// FRIEND ELEMENTS
const friendUsername = document.getElementById("friendUsername");
const searchFriendBtn = document.getElementById("searchFriendBtn");
const friendSearchMessage = document.getElementById("friendSearchMessage");
const friendSearchResult = document.getElementById("friendSearchResult");

const incomingRequests = document.getElementById("incomingRequests");
const myFriendsList = document.getElementById("myFriendsList");

const homeFriendsSection = document.getElementById("homeFriendsSection");
const homeFriendList = document.getElementById("homeFriendList");

// CHAT ELEMENTS
const chatPage = document.getElementById("chatPage");
const backChatBtn = document.getElementById("backChatBtn");
const chatFriendName = document.getElementById("chatFriendName");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

// STATUS ELEMENTS
const statusBtn = document.getElementById("statusBtn");
const statusPage = document.getElementById("statusPage");
const backStatusBtn = document.getElementById("backStatusBtn");
const chooseStatusBtn = document.getElementById("chooseStatusBtn");
const statusFileInput = document.getElementById("statusFileInput");
const statusCaption = document.getElementById("statusCaption");
const statusMessage = document.getElementById("statusMessage");
const myStatusList = document.getElementById("myStatusList");
const friendsStatusList = document.getElementById("friendsStatusList");

// PROFILE PHOTO BUTTON
changePhotoBtn.addEventListener("click", () => {
    settingsPhotoInput.click();
});

settingsPhotoInput.addEventListener("change", async () => {
    const file = settingsPhotoInput.files[0];

    if (!file || !currentUser) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        settingsMessage.textContent = "Only JPG, PNG and WEBP images are allowed.";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        settingsMessage.textContent = "Photo must be smaller than 5 MB.";
        return;
    }

    changePhotoBtn.disabled = true;
    changePhotoBtn.textContent = "Uploading...";
    settingsMessage.textContent = "Uploading photo...";

    try {
        const token = await currentUser.getIdToken(true);

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            SUPABASE_URL + "/functions/v1/upload-profile-photo",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "apikey": SUPABASE_KEY
                },
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.photoURL) {
            throw new Error(result.error || "Photo upload failed.");
        }

        const photoURL = result.photoURL;

        await setDoc(doc(db, "users", currentUser.uid), {
            photoURL: photoURL,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "publicProfiles", currentUser.uid), {
            photoURL: photoURL
        }, { merge: true });

        settingsPhoto.src = photoURL;
        userPhoto.src = photoURL;

        settingsMessage.textContent = "Profile photo updated successfully!";

        await loadMyFriends();

    } catch (error) {
        console.error("Photo upload error:", error);
        settingsMessage.textContent = error.message || "Photo upload failed.";
    }

    changePhotoBtn.disabled = false;
    changePhotoBtn.textContent = "Change Photo";
    settingsPhotoInput.value = "";
});

// ENABLE NOTIFICATIONS
enableNotificationsBtn.addEventListener("click", async () => {
    if (!currentUser) {
        notificationMessage.textContent = "Please login first.";
        return;
    }

    try {
        enableNotificationsBtn.disabled = true;
        notificationMessage.textContent = "Enabling notifications...";

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            notificationMessage.textContent = "Notification permission was not granted.";
            return;
        }

        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
            vapidKey: "BPOtzplmVaGH9NUsgPUxc3PouVx3ivPLL0-1Um5ykru6whx8eOshLO5cvaLO7QJ5z0ztYQSGg-cnSP8NT-lI0FE",
            serviceWorkerRegistration: registration
        });

        if (!token) {
            throw new Error("Could not get notification token.");
        }

        const tokenRef = doc(
            collection(db, "users", currentUser.uid, "fcmTokens")
        );

        await setDoc(tokenRef, {
            token: token,
            createdAt: serverTimestamp()
        });

        notificationMessage.textContent = "Notifications enabled successfully!";

    } catch (error) {
        console.error("Notification error:", error);
        notificationMessage.textContent = error.message;
    } finally {
        enableNotificationsBtn.disabled = false;
    }
});

// CREATE UNIQUE USERNAME
async function createUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const oldProfile = await getDoc(userRef);

    if (oldProfile.exists() && oldProfile.data().username) {
        return oldProfile.data().username;
    }

    const baseName = (user.displayName || "user")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12) || "user";

    for (let i = 0; i < 20; i++) {
        const number = Math.floor(1000 + Math.random() * 9000);
        const username = `${baseName}_${number}`;
        const usernameRef = doc(db, "usernames", username);

        const result = await runTransaction(db, async (transaction) => {
            const existingUser = await transaction.get(userRef);

            if (existingUser.exists() && existingUser.data().username) {
                return existingUser.data().username;
            }

            const taken = await transaction.get(usernameRef);
            if (taken.exists()) return null;

            transaction.set(usernameRef, { uid: user.uid });

            transaction.set(userRef, {
                uid: user.uid,
                displayName: user.displayName || "CHATTIX User",
                email: user.email || "",
                photoURL: user.photoURL || "",
                username,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });

            return username;
        });

        if (result) return result;
    }

    throw new Error("Could not create a unique username.");
}

// UPDATE PUBLIC PROFILE
async function updatePublicProfile(user, username) {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};

    await setDoc(doc(db, "publicProfiles", user.uid), {
        uid: user.uid,
        username,
        displayName: profile.displayName || user.displayName || "CHATTIX User",
        photoURL: profile.photoURL || user.photoURL || "",
        bio: profile.bio || ""
    }, { merge: true });
}

// LOAD SETTINGS PROFILE
async function loadSettingsProfile() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const profile = userSnap.exists() ? userSnap.data() : {};

        settingsPhoto.src = profile.photoURL || currentUser.photoURL || "./icon-192.png";
        settingsName.textContent = profile.displayName || currentUser.displayName || "My Profile";
        settingsEmail.textContent = currentUser.email || "";

        settingsDisplayName.value = profile.displayName || currentUser.displayName || "";
        settingsUsername.value = profile.username || "";
        settingsBio.value = profile.bio || "";

        settingsMessage.textContent = "";

    } catch (error) {
        console.error("Settings loading error:", error);
        settingsMessage.textContent = "Could not load profile.";
    }
}

// OPEN SETTINGS
settingsBtn.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    homePage.style.display = "none";
    addFriendPage.hidden = true;
    friendsPage.hidden = true;
    chatPage.hidden = true;
    statusPage.hidden = true;
    settingsPage.hidden = false;

    await loadSettingsProfile();
});

// BACK FROM SETTINGS
backSettingsBtn.addEventListener("click", () => {
    settingsPage.hidden = true;
    homePage.style.display = "block";
});

// SETTINGS LOGOUT
settingsLogoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        alert("Logout failed: " + error.message);
    }
});

// SAVE SETTINGS
saveSettingsBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const displayName = settingsDisplayName.value.trim();
    const username = settingsUsername.value.trim().toLowerCase();
    const bio = settingsBio.value.trim();

    if (!displayName) {
        settingsMessage.textContent = "Display Name is required.";
        return;
    }

    if (!/^[a-z0-9]+_[0-9]{4}$/.test(username)) {
        settingsMessage.textContent = "Username format: name_1234";
        return;
    }

    if (bio.length > 160) {
        settingsMessage.textContent = "Bio must be under 160 characters.";
        return;
    }

    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = "Saving...";

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const publicRef = doc(db, "publicProfiles", currentUser.uid);

        const userSnap = await getDoc(userRef);
        const oldProfile = userSnap.exists() ? userSnap.data() : {};
        const oldUsername = oldProfile.username || "";

        await runTransaction(db, async (transaction) => {
            const newUsernameRef = doc(db, "usernames", username);

            if (username !== oldUsername) {
                const usernameSnap = await transaction.get(newUsernameRef);

                if (usernameSnap.exists()) {
                    throw new Error("This username is already taken.");
                }
            }

            transaction.set(userRef, {
                uid: currentUser.uid,
                displayName,
                email: currentUser.email || "",
                photoURL: oldProfile.photoURL || currentUser.photoURL || "",
                username,
                bio,
                updatedAt: serverTimestamp()
            }, { merge: true });

            transaction.set(publicRef, {
                uid: currentUser.uid,
                username,
                displayName,
                photoURL: oldProfile.photoURL || currentUser.photoURL || "",
                bio
            }, { merge: true });

            if (username !== oldUsername) {
                transaction.set(newUsernameRef, {
                    uid: currentUser.uid
                });

                if (oldUsername) {
                    const oldUsernameRef = doc(db, "usernames", oldUsername);
                    transaction.delete(oldUsernameRef);
                }
            }
        });

        settingsName.textContent = displayName;
        userName.textContent = displayName;
        userEmail.textContent = "@" + username + " | " + (currentUser.email || "");
        settingsMessage.textContent = "Settings saved successfully!";

        await loadMyFriends();

    } catch (error) {
        console.error("Settings save error:", error);
        settingsMessage.textContent = error.message || "Could not save settings.";
    } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = "Save Changes";
    }
});

// CREATE FRIENDSHIP
async function ensureFriendship(requestDoc) {
    if (!currentUser) return;

    const data = requestDoc.data();
    if (data.status !== "accepted") return;

    const friendUid = data.senderUid === currentUser.uid
        ? data.recipientUid
        : data.senderUid;

    if (!friendUid || friendUid === currentUser.uid) return;

    const members = [currentUser.uid, friendUid].sort();
    const chatId = members.join("_");
    const friendshipRef = doc(db, "friendships", chatId);

    await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(friendshipRef);

        if (!existing.exists()) {
            transaction.set(friendshipRef, {
                members,
                requestId: requestDoc.id,
                createdAt: serverTimestamp()
            });
        }
    });
}

// GOOGLE LOGIN
googleLoginBtn.addEventListener("click", async () => {
    try {
        loginMessage.textContent = "Please wait...";
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        loginMessage.textContent = "Login failed: " + error.message;
    }
});

// AUTH CHECK
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        loginArea.style.display = "none";
        profileArea.style.display = "block";

        userName.textContent = user.displayName || "CHATTIX User";
        userEmail.textContent = "Setting up profile...";
        userPhoto.src = user.photoURL || "";

        try {
            const username = await createUserProfile(user);
            await updatePublicProfile(user, username);

            const profileSnap = await getDoc(doc(db, "users", user.uid));
            const profile = profileSnap.exists() ? profileSnap.data() : {};

            userPhoto.src = profile.photoURL || user.photoURL || "./icon-192.png";

            userName.textContent = profile.displayName || user.displayName || "CHATTIX User";
            userEmail.textContent = "@" + username + " | " + (user.email || "");

            homeFriendsSection.style.display = "block";
            await loadMyFriends();

        } catch (error) {
            console.error(error);
            userEmail.textContent = "Profile error: " + error.message;
        }

    } else {
        loginArea.style.display = "block";
        profileArea.style.display = "none";

        settingsPage.hidden = true;
        addFriendPage.hidden = true;
        friendsPage.hidden = true;
        chatPage.hidden = true;
        statusPage.hidden = true;
        homePage.style.display = "block";

        homeFriendsSection.style.display = "none";
        homeFriendList.replaceChildren();

        if (stopRequestsListener) {
            stopRequestsListener();
            stopRequestsListener = null;
        }

        if (stopChatListener) {
            stopChatListener();
            stopChatListener = null;
        }

        activeFriendUid = null;
        activeChatId = null;
    }
});

// LOGOUT
logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        alert("Logout failed: " + error.message);
    }
});

// OPEN ADD FRIEND PAGE
newChatBtn.addEventListener("click", () => {
    homePage.style.display = "none";
    friendsPage.hidden = true;
    chatPage.hidden = true;
    settingsPage.hidden = true;
    statusPage.hidden = true;
    addFriendPage.hidden = false;
});

// BACK TO HOME
backHomeBtn.addEventListener("click", () => {
    addFriendPage.hidden = true;
    homePage.style.display = "block";
});

// OPEN FRIENDS PAGE
friendsBtn.addEventListener("click", () => {
    homePage.style.display = "none";
    addFriendPage.hidden = true;
    chatPage.hidden = true;
    settingsPage.hidden = true;
    statusPage.hidden = true;
    friendsPage.hidden = false;

    if (!currentUser) {
        incomingRequests.textContent = "Please login first.";
        myFriendsList.textContent = "Please login first.";
        return;
    }

    startRequestsListener();
    loadMyFriends();
});

// BACK FROM FRIENDS
backFriendsBtn.addEventListener("click", () => {
    friendsPage.hidden = true;
    homePage.style.display = "block";
});

// SEARCH USERNAME
searchFriendBtn.addEventListener("click", searchFriend);

friendUsername.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchFriend();
});

async function searchFriend() {
    if (!currentUser) {
        friendSearchMessage.textContent = "Please login first.";
        return;
    }

    const username = friendUsername.value.trim().toLowerCase();
    friendSearchResult.replaceChildren();

    if (!username) {
        friendSearchMessage.textContent = "Please enter a username.";
        return;
    }

    friendSearchMessage.textContent = "Searching...";

    try {
        const usernameSnap = await getDoc(doc(db, "usernames", username));

        if (!usernameSnap.exists()) {
            friendSearchMessage.textContent = "User not found.";
            return;
        }

        const uid = usernameSnap.data().uid;

        if (uid === currentUser.uid) {
            friendSearchMessage.textContent = "You cannot add yourself.";
            return;
        }

        const profileSnap = await getDoc(doc(db, "publicProfiles", uid));

        if (!profileSnap.exists()) {
            friendSearchMessage.textContent =
                "This user needs to login once after the latest update.";
            return;
        }

        friendSearchMessage.textContent = "User found!";
        const profile = profileSnap.data();

        const card = document.createElement("div");
        card.style.cssText =
            "background:#202c28;padding:20px;border-radius:14px;margin-top:15px;";

        const name = document.createElement("h3");
        name.textContent = profile.displayName || "CHATTIX User";

        const handle = document.createElement("p");
        handle.textContent = "@" + profile.username;

        const sendBtn = document.createElement("button");
        sendBtn.textContent = "Send Friend Request";
        sendBtn.className = "login-btn";

        sendBtn.addEventListener("click", async () => {
            sendBtn.disabled = true;
            sendBtn.textContent = "Sending...";

            try {
                await sendFriendRequest(uid);
                sendBtn.textContent = "Request Sent";
                friendSearchMessage.textContent =
                    "Friend request sent successfully!";
            } catch (error) {
                console.error(error);
                sendBtn.disabled = false;
                sendBtn.textContent = "Send Friend Request";
                friendSearchMessage.textContent = error.message;
            }
        });

        card.append(name, handle, sendBtn);
        friendSearchResult.appendChild(card);

    } catch (error) {
        console.error(error);
        friendSearchMessage.textContent = "Search error: " + error.message;
    }
}

// SEND FRIEND REQUEST
async function sendFriendRequest(recipientUid) {
    if (!currentUser) throw new Error("Please login first.");

    const sentQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", currentUser.uid)
    );

    const receivedQuery = query(
        collection(db, "friendRequests"),
        where("recipientUid", "==", currentUser.uid)
    );

    const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
    ]);

    const allRequests = [...sentSnap.docs, ...receivedSnap.docs];

    const existing = allRequests.find((item) => {
        const data = item.data();

        const samePair =
            (data.senderUid === currentUser.uid &&
             data.recipientUid === recipientUid) ||
            (data.senderUid === recipientUid &&
             data.recipientUid === currentUser.uid);

        return samePair && ["pending", "accepted"].includes(data.status);
    });

    if (existing) {
        if (existing.data().status === "accepted") {
            throw new Error("You are already friends.");
        }

        if (existing.data().senderUid === recipientUid) {
            throw new Error("This user has already sent you a request. Check Friends.");
        }

        throw new Error("Friend request already sent.");
    }

    await addDoc(collection(db, "friendRequests"), {
        senderUid: currentUser.uid,
        recipientUid,
        status: "pending",
        createdAt: serverTimestamp()
    });
}

// LISTEN FOR INCOMING REQUESTS
function startRequestsListener() {
    if (!currentUser) return;

    if (stopRequestsListener) stopRequestsListener();

    const requestsQuery = query(
        collection(db, "friendRequests"),
        where("recipientUid", "==", currentUser.uid)
    );

    stopRequestsListener = onSnapshot(requestsQuery, async (snapshot) => {
        incomingRequests.replaceChildren();

        const pending = snapshot.docs.filter(
            item => item.data().status === "pending"
        );

        if (pending.length === 0) {
            incomingRequests.textContent = "No friend requests yet.";
            return;
        }

        for (const requestDoc of pending) {
            const data = requestDoc.data();

            try {
                const profileSnap = await getDoc(
                    doc(db, "publicProfiles", data.senderUid)
                );

                const profile = profileSnap.exists()
                    ? profileSnap.data()
                    : { displayName: "CHATTIX User", username: "unknown" };

                const card = document.createElement("div");
                card.style.cssText =
                    "background:#202c28;padding:16px;border-radius:12px;margin-top:14px;text-align:left;";

                const name = document.createElement("h3");
                name.textContent = profile.displayName;

                const handle = document.createElement("p");
                handle.textContent = "@" + profile.username;

                const buttons = document.createElement("div");
                buttons.style.cssText = "display:flex;gap:10px;margin-top:14px;";

                const acceptBtn = document.createElement("button");
                acceptBtn.textContent = "✓ Accept";
                acceptBtn.className = "login-btn";
                acceptBtn.style.marginTop = "0";

                const rejectBtn = document.createElement("button");
                rejectBtn.textContent = "✕ Reject";
                rejectBtn.className = "login-btn";
                rejectBtn.style.cssText = "margin-top:0;background:#713b3b;";

                acceptBtn.addEventListener("click", () =>
                    updateRequestStatus(requestDoc.id, "accepted")
                );

                rejectBtn.addEventListener("click", () =>
                    updateRequestStatus(requestDoc.id, "rejected")
                );

                buttons.append(acceptBtn, rejectBtn);
                card.append(name, handle, buttons);
                incomingRequests.appendChild(card);

            } catch (error) {
                console.error(error);
            }
        }
    }, (error) => {
        console.error(error);
        incomingRequests.textContent =
            "Could not load requests: " + error.message;
    });
}

// ACCEPT OR REJECT REQUEST
async function updateRequestStatus(requestId, status) {
    try {
        await updateDoc(doc(db, "friendRequests", requestId), { status });

        if (status === "accepted") {
            const requestSnap = await getDoc(doc(db, "friendRequests", requestId));

            if (requestSnap.exists()) {
                await ensureFriendship(requestSnap);
            }

            await loadMyFriends();
        }

    } catch (error) {
        console.error(error);
        alert("Request update failed: " + error.message);
    }
}

// LOAD FRIENDS
async function loadMyFriends() {
    if (!currentUser) return;

    const loadVersion = ++friendsLoadVersion;

    myFriendsList.textContent = "Loading friends...";
    homeFriendList.replaceChildren();

    try {
        const sentQuery = query(
            collection(db, "friendRequests"),
            where("senderUid", "==", currentUser.uid)
        );

        const receivedQuery = query(
            collection(db, "friendRequests"),
            where("recipientUid", "==", currentUser.uid)
        );

        const [sentSnap, receivedSnap] = await Promise.all([
            getDocs(sentQuery),
            getDocs(receivedQuery)
        ]);

        if (loadVersion !== friendsLoadVersion) return;

        const accepted = [...sentSnap.docs, ...receivedSnap.docs]
            .filter(item => item.data().status === "accepted");

        myFriendsList.replaceChildren();
        homeFriendList.replaceChildren();

        if (accepted.length === 0) {
            myFriendsList.textContent = "No friends added yet.";
            homeFriendList.textContent =
                "No friends yet. Add a friend to start chatting.";
            return;
        }

        const shown = new Set();

        for (const item of accepted) {
            const data = item.data();

            const friendUid = data.senderUid === currentUser.uid
                ? data.recipientUid
                : data.senderUid;

            if (!friendUid || shown.has(friendUid)) continue;
            shown.add(friendUid);

            await ensureFriendship(item);

            if (loadVersion !== friendsLoadVersion) return;

            const profileSnap = await getDoc(
                doc(db, "publicProfiles", friendUid)
            );

            if (loadVersion !== friendsLoadVersion) return;
            if (!profileSnap.exists()) continue;

            const profile = profileSnap.data();
            const displayName = profile.displayName || "CHATTIX User";
            const username = profile.username || "unknown";

            // HOME FRIEND CARD
            const homeCard = document.createElement("div");

            homeCard.style.cssText = `
                display:flex;
                align-items:center;
                gap:14px;
                padding:14px;
                margin-bottom:10px;
                background:#202c28;
                border-radius:14px;
                cursor:pointer;
                color:white;
            `;

            const photo = document.createElement("img");
            photo.src = profile.photoURL || "./icon-192.png";
            photo.alt = "Profile";
            photo.style.cssText = `
                width:52px;
                height:52px;
                border-radius:50%;
                object-fit:cover;
                background:#075e50;
            `;

            const details = document.createElement("div");

            const homeName = document.createElement("h3");
            homeName.textContent = displayName;
            homeName.style.margin = "0 0 5px";

            const homeUsername = document.createElement("p");
            homeUsername.textContent = "@" + username;
            homeUsername.style.cssText =
                "margin:0;color:#aaa;font-size:13px;";

            details.append(homeName, homeUsername);
            homeCard.append(photo, details);

            homeCard.addEventListener("click", () => {
                openChat(friendUid, displayName);
            });

            homeFriendList.appendChild(homeCard);

            // FRIENDS PAGE CARD
            const friendCard = document.createElement("div");
            friendCard.style.cssText =
                "background:#202c28;padding:15px;border-radius:12px;margin-top:12px;text-align:left;";

            const name = document.createElement("h3");
            name.textContent = displayName;

            const handle = document.createElement("p");
            handle.textContent = "@" + username;

            const chatBtn = document.createElement("button");
            chatBtn.textContent = "💬 Chat";
            chatBtn.className = "login-btn";

            chatBtn.addEventListener("click", () => {
                openChat(friendUid, displayName);
            });

            friendCard.append(name, handle, chatBtn);
            myFriendsList.appendChild(friendCard);
        }

    } catch (error) {
        if (loadVersion !== friendsLoadVersion) return;

        console.error(error);

        myFriendsList.textContent =
            "Could not load friends: " + error.message;

        homeFriendList.textContent =
            "Could not load chats: " + error.message;
    }
}

// OPEN CHAT
async function openChat(friendUid, friendName) {
    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    chatReturnTo = friendsPage.hidden ? "home" : "friends";
    activeFriendUid = friendUid;

    const members = [currentUser.uid, friendUid].sort();
    activeChatId = members.join("_");

    homePage.style.display = "none";
    friendsPage.hidden = true;
    addFriendPage.hidden = true;
    settingsPage.hidden = true;
    statusPage.hidden = true;
    chatPage.hidden = false;

    chatFriendName.textContent = friendName;
    chatMessages.textContent = "Loading messages...";

    if (stopChatListener) {
        stopChatListener();
        stopChatListener = null;
    }

    try {
        await setDoc(doc(db, "conversations", activeChatId), {
            members,
            updatedAt: serverTimestamp()
        }, { merge: true });

        const messagesQuery = query(
            collection(db, "conversations", activeChatId, "messages"),
            orderBy("createdAt", "asc")
        );

        stopChatListener = onSnapshot(messagesQuery, (snapshot) => {
            chatMessages.replaceChildren();

            if (snapshot.empty) {
                chatMessages.textContent = "Start your conversation!";
                return;
            }

            snapshot.forEach((messageDoc) => {
                const data = messageDoc.data();

                const bubble = document.createElement("div");
                bubble.className = "message";

                if (data.senderUid === currentUser.uid) {
                    bubble.classList.add("mine");
                }

                const messageText = document.createElement("span");
                messageText.textContent = data.text || "";

                const time = document.createElement("small");

                if (data.createdAt) {
                    time.textContent = data.createdAt.toDate()
                        .toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                        });
                } else {
                    time.textContent = "Sending...";
                }

                bubble.append(messageText, time);
                chatMessages.appendChild(bubble);
            });

            chatMessages.scrollTop = chatMessages.scrollHeight;

        }, (error) => {
            console.error(error);
            chatMessages.textContent = "Chat error: " + error.message;
        });

    } catch (error) {
        console.error(error);
        chatMessages.textContent =
            "Could not open chat: " + error.message;
    }
}

// SEND MESSAGE
async function sendMessage() {
    const messageText = messageInput.value.trim();

    if (!messageText || !currentUser || !activeChatId || !activeFriendUid) {
        return;
    }

    if (messageText.length > 2000) {
        alert("Message is too long. Maximum 2000 characters.");
        return;
    }

    sendMessageBtn.disabled = true;

    try {
        await addDoc(
            collection(db, "conversations", activeChatId, "messages"),
            {
                senderUid: currentUser.uid,
                text: messageText,
                createdAt: serverTimestamp()
            }
        );

        messageInput.value = "";

        // SEND PUSH NOTIFICATION
        try {
            const firebaseIdToken = await currentUser.getIdToken();

            const response = await fetch(
                SUPABASE_URL + "/functions/v1/send-chat-notification",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${firebaseIdToken}`,
                        "apikey": SUPABASE_KEY
                    },
                    body: JSON.stringify({
                        conversationId: activeChatId
                    })
                }
            );

            if (!response.ok) {
                console.error(
                    "Notification request failed:",
                    await response.text()
                );
            }

        } catch (notificationError) {
            console.error("Notification error:", notificationError);
        }

    } catch (error) {
        console.error(error);
        alert("Message not sent: " + error.message);

    } finally {
        sendMessageBtn.disabled = false;
        messageInput.focus();
    }
}

// SEND BUTTON
sendMessageBtn.addEventListener("click", sendMessage);

// ENTER TO SEND
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
});

// BACK FROM CHAT
backChatBtn.addEventListener("click", () => {
    if (stopChatListener) {
        stopChatListener();
        stopChatListener = null;
    }

    activeFriendUid = null;
    activeChatId = null;

    chatPage.hidden = true;

    if (chatReturnTo === "friends") {
        friendsPage.hidden = false;
        loadMyFriends();
    } else {
        friendsPage.hidden = true;
        homePage.style.display = "block";
        loadMyFriends();
    }
});


// =====================================
// CHATTIX STATUS FEATURE
// =====================================

// CALL STATUS EDGE FUNCTION
async function callStatusAPI(body) {
    if (!currentUser) {
        throw new Error("Please login first.");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(STATUS_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey": SUPABASE_KEY
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Status request failed.");
    }

    return result;
}

// OPEN STATUS PAGE
statusBtn.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    homePage.style.display = "none";
    addFriendPage.hidden = true;
    friendsPage.hidden = true;
    chatPage.hidden = true;
    settingsPage.hidden = true;
    statusPage.hidden = false;

    await loadStatuses();
});

// BACK FROM STATUS
backStatusBtn.addEventListener("click", () => {
    statusPage.hidden = true;
    homePage.style.display = "block";
});

// OPEN FILE PICKER
chooseStatusBtn.addEventListener("click", () => {
    if (!currentUser) {
        statusMessage.textContent = "Please login first.";
        return;
    }

    statusFileInput.click();
});

// UPLOAD STATUS
statusFileInput.addEventListener("change", async () => {
    const file = statusFileInput.files[0];

    if (!file || !currentUser) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm"
    ];

    if (!allowedTypes.includes(file.type)) {
        statusMessage.textContent =
            "Only JPG, PNG, WEBP, MP4 and WEBM files are allowed.";
        statusFileInput.value = "";
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        statusMessage.textContent = "File must be smaller than 50 MB.";
        statusFileInput.value = "";
        return;
    }

    const caption = statusCaption.value.trim();

    if (caption.length > 140) {
        statusMessage.textContent = "Caption must be under 140 characters.";
        return;
    }

    chooseStatusBtn.disabled = true;
    chooseStatusBtn.textContent = "Uploading...";
    statusMessage.textContent = "Preparing your status...";

    try {
        // GET PRIVATE UPLOAD LINK
        const uploadInfo = await callStatusAPI({
            action: "create-upload",
            contentType: file.type,
            size: file.size
        });

        statusMessage.textContent = "Uploading media...";

        // UPLOAD FILE TO PRIVATE SUPABASE BUCKET
        const { error: uploadError } = await supabase.storage
            .from("status-media")
            .uploadToSignedUrl(
                uploadInfo.path,
                uploadInfo.token,
                file
            );

        if (uploadError) {
            throw uploadError;
        }

        statusMessage.textContent = "Saving status...";

        // SAVE STATUS DETAILS IN FIRESTORE
        await addDoc(collection(db, "statuses"), {
            uid: currentUser.uid,
            mediaPath: uploadInfo.path,
            mediaType: file.type.startsWith("video/") ? "video" : "image",
            caption: caption,
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(
                new Date(Date.now() + 24 * 60 * 60 * 1000)
            )
        });

        statusMessage.textContent = "Status uploaded successfully!";
        statusCaption.value = "";
        statusFileInput.value = "";

        await loadStatuses();

    } catch (error) {
        console.error("Status upload error:", error);
        statusMessage.textContent =
            error.message || "Could not upload status.";
    } finally {
        chooseStatusBtn.disabled = false;
        chooseStatusBtn.textContent = "＋ Add Status";
    }
});

// GET TEMPORARY PRIVATE MEDIA LINK
async function getStatusViewUrl(statusId) {
    const result = await callStatusAPI({
        action: "get-view-url",
        statusId: statusId
    });

    return result.signedUrl;
}

// CREATE STATUS CARD
async function createStatusCard(statusDoc, isOwn) {
    const data = statusDoc.data();

    const card = document.createElement("div");
    card.className = "status-card";

    const heading = document.createElement("h3");
    heading.className = "status-meta";
    heading.textContent = isOwn ? "My Status" : "Friend's Status";

    const mediaContainer = document.createElement("div");
    mediaContainer.className = "status-media";

    try {
        const mediaUrl = await getStatusViewUrl(statusDoc.id);

        if (data.mediaType === "video") {
            const video = document.createElement("video");
            video.src = mediaUrl;
            video.controls = true;
            video.playsInline = true;
            video.className = "status-preview";
            mediaContainer.appendChild(video);
        } else {
            const image = document.createElement("img");
            image.src = mediaUrl;
            image.alt = "Status";
            image.className = "status-preview";
            mediaContainer.appendChild(image);
        }

    } catch (error) {
        console.error("Status media error:", error);
        return null;
    }

    card.append(heading, mediaContainer);

    if (data.caption) {
        const caption = document.createElement("p");
        caption.className = "status-caption-text";
        caption.textContent = data.caption;
        card.appendChild(caption);
    }

    const date = document.createElement("small");

    if (data.createdAt) {
        date.textContent = data.createdAt.toDate().toLocaleString();
    } else {
        date.textContent = "Recently uploaded";
    }

    date.className = "status-date";
    card.appendChild(date);

    if (isOwn) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete Status";
        deleteBtn.className = "status-delete-btn";

        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Delete this status?")) return;

            deleteBtn.disabled = true;
            deleteBtn.textContent = "Deleting...";

            try {
                await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
                    .then(({ deleteDoc }) =>
                        deleteDoc(doc(db, "statuses", statusDoc.id))
                    );

                statusMessage.textContent = "Status deleted.";
                await loadStatuses();

            } catch (error) {
                console.error(error);
                statusMessage.textContent =
                    "Could not delete status: " + error.message;
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Delete Status";
            }
        });

        card.appendChild(deleteBtn);
    }

    return card;
}

// LOAD OWN AND FRIENDS' STATUSES
async function loadStatuses() {
    if (!currentUser) return;

    myStatusList.replaceChildren();
    friendsStatusList.replaceChildren();

    myStatusList.textContent = "Loading...";
    friendsStatusList.textContent = "Loading friends' statuses...";

    try {
        // GET ACCEPTED FRIEND REQUESTS
        const sentQuery = query(
            collection(db, "friendRequests"),
            where("senderUid", "==", currentUser.uid)
        );

        const receivedQuery = query(
            collection(db, "friendRequests"),
            where("recipientUid", "==", currentUser.uid)
        );

        const [sentSnap, receivedSnap] = await Promise.all([
            getDocs(sentQuery),
            getDocs(receivedQuery)
        ]);

        const acceptedRequests = [
            ...sentSnap.docs,
            ...receivedSnap.docs
        ].filter(item => item.data().status === "accepted");

        const friendUids = new Set();

        acceptedRequests.forEach((item) => {
            const data = item.data();

            const friendUid = data.senderUid === currentUser.uid
                ? data.recipientUid
                : data.senderUid;

            if (friendUid && friendUid !== currentUser.uid) {
                friendUids.add(friendUid);
            }
        });

        // LOAD OWN STATUS
        const now = Timestamp.now();

        const ownQuery = query(
            collection(db, "statuses"),
            where("uid", "==", currentUser.uid),
            where("expiresAt", ">", now)
        );

        const ownSnap = await getDocs(ownQuery);

        myStatusList.replaceChildren();

        if (ownSnap.empty) {
            myStatusList.textContent = "You haven't shared a status yet.";
        } else {
            const ownStatuses = [...ownSnap.docs].sort((a, b) => {
                const aTime = a.data().createdAt?.toMillis?.() || 0;
                const bTime = b.data().createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            for (const statusDoc of ownStatuses) {
                const card = await createStatusCard(statusDoc, true);
                if (card) myStatusList.appendChild(card);
            }
        }

        // LOAD FRIENDS' STATUSES
        friendsStatusList.replaceChildren();

        if (friendUids.size === 0) {
            friendsStatusList.textContent = "Add friends to see their statuses.";
            return;
        }

        let friendsStatusCount = 0;

        for (const friendUid of friendUids) {
            try {
                const friendQuery = query(
                    collection(db, "statuses"),
                    where("uid", "==", friendUid),
                    where("expiresAt", ">", Timestamp.now())
                );

                const friendSnap = await getDocs(friendQuery);

                const friendProfileSnap = await getDoc(
                    doc(db, "publicProfiles", friendUid)
                );

                const friendProfile = friendProfileSnap.exists()
                    ? friendProfileSnap.data()
                    : {};

                const friendName = friendProfile.displayName || "Friend";

                const sortedStatuses = [...friendSnap.docs].sort((a, b) => {
                    const aTime = a.data().createdAt?.toMillis?.() || 0;
                    const bTime = b.data().createdAt?.toMillis?.() || 0;
                    return bTime - aTime;
                });

                for (const statusDoc of sortedStatuses) {
                    const card = await createStatusCard(statusDoc, false);

                    if (card) {
                        const heading = card.querySelector(".status-meta");
                        if (heading) heading.textContent = friendName;

                        friendsStatusList.appendChild(card);
                        friendsStatusCount++;
                    }
                }

            } catch (friendError) {
                console.error("Friend status load error:", friendError);
            }
        }

        if (friendsStatusCount === 0) {
            friendsStatusList.textContent = "No new statuses from friends.";
        }

    } catch (error) {
        console.error("Load statuses error:", error);

        myStatusList.textContent =
            "Could not load your statuses: " + error.message;

        friendsStatusList.textContent =
            "Could not load friends' statuses: " + error.message;
    }
}


// SERVICE WORKER
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => console.log("CHATTIX App Ready!"))
            .catch((error) => console.log("App Setup Error:", error));
    });
}
