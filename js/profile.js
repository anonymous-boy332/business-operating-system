import { supabase } from "../supabase.js";

const $ = (id) => document.getElementById(id);
const profileForm = $("profileForm");
const passwordForm = $("passwordForm");
const saveProfileButton = $("saveProfileButton");
const updatePasswordButton = $("updatePasswordButton");
const profilePictureInput = $("profilePictureInput");
const changeProfilePictureButton = $("changeProfilePictureButton");
const saveProfilePictureButton = $("saveProfilePictureButton");
const removeProfilePictureButton = $("removeProfilePictureButton");
const avatarInitial = $("profileAvatar");
const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
let currentUser = null;
let selectedAvatarFile = null;
let previewUrl = null;
let avatarRenderToken = 0;

function showMessage(target, message, isError = false) {
    target.textContent = message;
    target.classList.toggle("is-error", isError);
}

function setProfileControlsEnabled(enabled) {
    for (const control of [
        $("editProfileButton"),
        saveProfileButton,
        updatePasswordButton,
        changeProfilePictureButton,
        saveProfilePictureButton,
        removeProfilePictureButton
    ]) {
        control.disabled = !enabled;
    }

    for (const input of profileForm.querySelectorAll("input")) {
        input.disabled = !enabled;
    }
    for (const input of passwordForm.querySelectorAll("input")) {
        input.disabled = !enabled;
    }
}

function renderUser(user) {
    const name = user.user_metadata?.full_name?.trim() || "";
    const email = user.email || "";
    const avatarText = name || email || "S";

    $("profileName").value = name;
    $("profileEmail").value = email;
    $("profileDisplayName").textContent = name || "Synvora Member";
    $("profileDisplayEmail").textContent = email;
    avatarInitial.textContent = Array.from(avatarText)[0].toUpperCase();
    $("profileVerification").textContent = user.email_confirmed_at
        ? "Verified account"
        : "Email not verified";
    $("profileSecurityStatus").textContent = user.email_confirmed_at
        ? "Email verified"
        : "Verify your email";

    const createdAt = user.created_at ? new Date(user.created_at) : null;
    $("profileMemberSince").textContent =
        createdAt && !Number.isNaN(createdAt.getTime())
            ? new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(createdAt)
            : "—";

    removeProfilePictureButton.hidden = !user.user_metadata?.avatar_path;
    saveProfilePictureButton.hidden = !selectedAvatarFile;
    if (user.user_metadata?.avatar_path) {
        loadAvatar(user.user_metadata.avatar_path);
    } else {
        clearAvatarImage();
    }
}

function clearAvatarImage() {
    avatarRenderToken += 1;
    const image = $("profileAvatarImage");
    image.onload = null;
    image.onerror = null;
    image.hidden = true;
    image.removeAttribute("src");
    avatarInitial.hidden = false;
}

async function loadAvatar(path) {
    const renderToken = ++avatarRenderToken;
    try {
        const { data, error } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(path, 60 * 60);
        if (error) throw error;
        if (renderToken !== avatarRenderToken) return;

        const image = $("profileAvatarImage");
        image.onload = () => {
            if (renderToken !== avatarRenderToken) return;
            image.hidden = false;
            avatarInitial.hidden = true;
        };
        image.onerror = () => {
            if (renderToken !== avatarRenderToken) return;
            clearAvatarImage();
            console.error("[profile] Saved profile picture could not be displayed.");
        };
        image.src = data.signedUrl;
    } catch (error) {
        if (renderToken !== avatarRenderToken) return;
        clearAvatarImage();
        console.error("[profile] Could not load profile picture:", error);
        showMessage(
            $("profilePictureMessage"),
            "Saved profile picture could not be loaded. Check the profile-avatars storage setup.",
            true
        );
    }
}

function showAvatarPreview(file) {
    const renderToken = ++avatarRenderToken;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);

    const image = $("profileAvatarImage");
    image.onload = () => {
        if (renderToken !== avatarRenderToken) return;
        image.hidden = false;
        avatarInitial.hidden = true;
    };
    image.onerror = () => {
        if (renderToken !== avatarRenderToken) return;
        clearAvatarImage();
        showMessage($("profilePictureMessage"), "That image could not be previewed.", true);
    };
    image.src = previewUrl;
}

function clearSelectedAvatar() {
    selectedAvatarFile = null;
    profilePictureInput.value = "";
    saveProfilePictureButton.hidden = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;

    if (currentUser?.user_metadata?.avatar_path) {
        loadAvatar(currentUser.user_metadata.avatar_path);
    } else {
        clearAvatarImage();
    }
}

async function loadProfile() {
    setProfileControlsEnabled(false);

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        currentUser = data.session?.user || null;
        if (!currentUser) {
            $("profileAuthNotice").hidden = false;
            $("profileDisplayName").textContent = "Sign in required";
            $("profileDisplayEmail").textContent = "Sign in to load your account details.";
            $("profileVerification").textContent = "Not signed in";
            $("profileSecurityStatus").textContent = "Unavailable";
            $("profileMessage").textContent = "Your account session was not found.";
            $("profilePictureMessage").textContent = "Sign in before changing your profile picture.";
            return;
        }

        renderUser(currentUser);
        setProfileControlsEnabled(true);
    } catch (error) {
        console.error("[profile] Could not load account:", error);
        $("profileDisplayName").textContent = "Profile unavailable";
        $("profileDisplayEmail").textContent = "Your account could not be loaded.";
        showMessage($("profileMessage"), error.message || "Could not load your profile.", true);
    }
}

function focusProfileForm() {
    $("profileDetailsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("profileName").focus({ preventScroll: true });
}

async function saveProfilePicture() {
    if (!currentUser) {
        showMessage($("profilePictureMessage"), "Sign in before changing your profile picture.", true);
        return;
    }
    if (!selectedAvatarFile) {
        showMessage($("profilePictureMessage"), "Choose a picture first.", true);
        return;
    }

    changeProfilePictureButton.disabled = true;
    saveProfilePictureButton.disabled = true;
    removeProfilePictureButton.disabled = true;
    showMessage($("profilePictureMessage"), "Uploading your profile picture...");

    const previousObjectPath = currentUser.user_metadata?.avatar_path;
    const objectPath =
        `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-avatar`;
    let uploaded = false;
    try {
        const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(objectPath, selectedAvatarFile, {
                cacheControl: "3600",
                contentType: selectedAvatarFile.type,
                upsert: true
            });
        if (uploadError) throw uploadError;
        uploaded = true;

        const { data, error } = await supabase.auth.updateUser({
            data: { ...currentUser.user_metadata, avatar_path: objectPath }
        });
        if (error) throw error;

        currentUser = data.user || {
            ...currentUser,
            user_metadata: { ...currentUser.user_metadata, avatar_path: objectPath }
        };
        selectedAvatarFile = null;
        saveProfilePictureButton.hidden = true;
        profilePictureInput.value = "";
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        renderUser(currentUser);
        if (previousObjectPath) {
            const { error: removeError } = await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([previousObjectPath]);
            if (removeError) {
                console.error("[profile] New picture saved but previous image cleanup failed:", removeError);
                showMessage(
                    $("profilePictureMessage"),
                    "Picture saved, but the previous stored image could not be deleted.",
                    true
                );
                return;
            }
        }
        showMessage($("profilePictureMessage"), "Profile picture saved successfully.");
    } catch (error) {
        console.error("[profile] Could not save profile picture:", error);
        let message = error.message || "Profile picture could not be saved.";
        if (uploaded) {
            try {
                const { error: cleanupError } = await supabase.storage
                    .from(AVATAR_BUCKET)
                    .remove([objectPath]);
                if (cleanupError) throw cleanupError;
            } catch (cleanupError) {
                console.error("[profile] Could not clean up an incomplete profile picture upload:", cleanupError);
                message += " The incomplete upload could not be removed.";
            }
        }
        showMessage($("profilePictureMessage"), message, true);
    } finally {
        changeProfilePictureButton.disabled = false;
        saveProfilePictureButton.disabled = false;
        removeProfilePictureButton.disabled = !currentUser?.user_metadata?.avatar_path;
    }
}

async function removeProfilePicture() {
    const objectPath = currentUser?.user_metadata?.avatar_path;
    if (!objectPath) return;

    removeProfilePictureButton.disabled = true;
    changeProfilePictureButton.disabled = true;
    showMessage($("profilePictureMessage"), "Removing your profile picture...");

    try {
        const { data, error } = await supabase.auth.updateUser({
            data: { ...currentUser.user_metadata, avatar_path: null }
        });
        if (error) throw error;

        currentUser = data.user || {
            ...currentUser,
            user_metadata: { ...currentUser.user_metadata, avatar_path: null }
        };
        selectedAvatarFile = null;
        saveProfilePictureButton.hidden = true;
        profilePictureInput.value = "";
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        renderUser(currentUser);

        const { error: removeError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove([objectPath]);
        if (removeError) {
            console.error("[profile] Picture removed from account but storage cleanup failed:", removeError);
            showMessage(
                $("profilePictureMessage"),
                "Picture removed from your profile, but its stored file could not be deleted.",
                true
            );
            return;
        }

        showMessage($("profilePictureMessage"), "Profile picture removed.");
    } catch (error) {
        console.error("[profile] Could not remove profile picture:", error);
        showMessage($("profilePictureMessage"), error.message || "Profile picture could not be removed.", true);
    } finally {
        removeProfilePictureButton.disabled = !currentUser?.user_metadata?.avatar_path;
        changeProfilePictureButton.disabled = false;
    }
}

async function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) {
        showMessage($("profileMessage"), "Sign in before saving profile changes.", true);
        return;
    }

    const name = $("profileName").value.trim();
    const email = $("profileEmail").value.trim();
    if (!name) {
        showMessage($("profileMessage"), "Please enter your full name.", true);
        $("profileName").focus();
        return;
    }
    if (!email) {
        showMessage($("profileMessage"), "Please enter your email address.", true);
        $("profileEmail").focus();
        return;
    }
    if (!$("profileEmail").checkValidity()) {
        showMessage($("profileMessage"), "Enter a valid email address.", true);
        $("profileEmail").focus();
        return;
    }

    const updates = {
        data: { ...currentUser.user_metadata, full_name: name }
    };
    const emailChanged = email.toLowerCase() !== String(currentUser.email || "").toLowerCase();
    if (emailChanged) updates.email = email;

    saveProfileButton.disabled = true;
    showMessage($("profileMessage"), "Saving your profile...");

    try {
        const { data, error } = await supabase.auth.updateUser(updates);
        if (error) throw error;

        currentUser = data.user || { ...currentUser, user_metadata: updates.data };
        renderUser(currentUser);
        showMessage(
            $("profileMessage"),
            emailChanged
                ? "Profile saved. Check your new email inbox to confirm the address change."
                : "Profile changes saved successfully."
        );
    } catch (error) {
        console.error("[profile] Could not save profile:", error);
        showMessage($("profileMessage"), error.message || "Profile changes could not be saved.", true);
    } finally {
        saveProfileButton.disabled = false;
    }
}

async function updatePassword(event) {
    event.preventDefault();
    if (!currentUser?.email) {
        showMessage($("passwordMessage"), "Sign in before changing your password.", true);
        return;
    }

    const currentPassword = $("currentPassword").value;
    const newPassword = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage($("passwordMessage"), "Complete all password fields.", true);
        return;
    }
    if (newPassword.length < 8) {
        showMessage($("passwordMessage"), "Use at least 8 characters for your new password.", true);
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage($("passwordMessage"), "The new passwords do not match.", true);
        return;
    }
    if (newPassword === currentPassword) {
        showMessage($("passwordMessage"), "Choose a password different from your current one.", true);
        return;
    }

    updatePasswordButton.disabled = true;
    showMessage($("passwordMessage"), "Verifying your current password...");

    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });
        if (signInError) throw new Error("Current password is incorrect.");

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        passwordForm.reset();
        showMessage($("passwordMessage"), "Password updated successfully.");
    } catch (error) {
        console.error("[profile] Could not update password:", error);
        showMessage($("passwordMessage"), error.message || "Password could not be updated.", true);
    } finally {
        updatePasswordButton.disabled = false;
    }
}

$("editProfileButton").addEventListener("click", focusProfileForm);
changeProfilePictureButton.addEventListener("click", () => profilePictureInput.click());
profilePictureInput.addEventListener("change", () => {
    const file = profilePictureInput.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        clearSelectedAvatar();
        showMessage($("profilePictureMessage"), "Choose a JPG, PNG, or WebP image.", true);
        return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
        clearSelectedAvatar();
        showMessage($("profilePictureMessage"), "Profile pictures must be 2 MB or smaller.", true);
        return;
    }

    selectedAvatarFile = file;
    showAvatarPreview(file);
    saveProfilePictureButton.hidden = false;
    showMessage($("profilePictureMessage"), "Preview ready. Save picture to upload it.");
});
saveProfilePictureButton.addEventListener("click", saveProfilePicture);
removeProfilePictureButton.addEventListener("click", removeProfilePicture);
profileForm.addEventListener("submit", saveProfile);
passwordForm.addEventListener("submit", updatePassword);
loadProfile();
