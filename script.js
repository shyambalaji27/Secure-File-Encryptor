const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const dropArea = document.getElementById("dropArea");

let selectedFile = null;

// Display selected file details
fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0];
    updateFileInfo();
});

function updateFileInfo() {
    if (!selectedFile) return;

    fileName.textContent = selectedFile.name;
    fileSize.textContent = (selectedFile.size / 1024).toFixed(2) + " KB";
    fileType.textContent = selectedFile.type || "Unknown";
}

// Drag & Drop
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#00ff99";
});

dropArea.addEventListener("dragleave", () => {
    dropArea.style.borderColor = "#00d9ff";
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();

    selectedFile = e.dataTransfer.files[0];

    const dt = new DataTransfer();
    dt.items.add(selectedFile);
    fileInput.files = dt.files;

    updateFileInfo();
});

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);

    bytes.forEach(b => binary += String.fromCharCode(b));

    return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

// Create AES Key
async function createKey(password) {

    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("SecureCryptSalt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );

}

// Encrypt
document.getElementById("encryptBtn").addEventListener("click", async () => {

    if (!selectedFile) {
        alert("Please choose a file.");
        return;
    }

    const password = document.getElementById("password").value;

    if (!password) {
        alert("Please enter a password.");
        return;
    }

    const text = await selectedFile.text();

    const encoder = new TextEncoder();

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await createKey(password);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        encoder.encode(text)
    );

    const output = JSON.stringify({
        iv: bufferToBase64(iv),
        data: bufferToBase64(encrypted)
    });

    downloadFile(output, selectedFile.name + ".secure");

    alert("✅ File encrypted successfully.");

});

// Decrypt
document.getElementById("decryptBtn").addEventListener("click", async () => {

    if (!selectedFile) {
        alert("Please select an encrypted (.secure) file.");
        return;
    }

    const password = document.getElementById("password").value;

    if (!password) {
        alert("Enter the password.");
        return;
    }

    try {

        const json = JSON.parse(await selectedFile.text());

        const iv = new Uint8Array(base64ToBuffer(json.iv));

        const encrypted = base64ToBuffer(json.data);

        const key = await createKey(password);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            encrypted
        );

        const decoder = new TextDecoder();

        downloadFile(
            decoder.decode(decrypted),
            selectedFile.name.replace(".secure", "")
        );

        alert("✅ File decrypted successfully.");

    }

    catch {

        alert("❌ Wrong password or invalid encrypted file.");

    }

});

// Download file
function downloadFile(content, filename) {

    const blob = new Blob([content]);

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = filename;

    a.click();

    URL.revokeObjectURL(url);

}
