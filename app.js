import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "./mock-firebase.js";

const complaintForm = document.getElementById('complaintForm');
const submitBtn = document.getElementById('submitBtn');

complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // UI Feedback: Loading state
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";

    try {
        // Add data to Firestore
        await addDoc(collection(db, "complaints"), {
            name: name,
            phone: phone,
            email: email,
            message: message,
            timestamp: serverTimestamp() // Adds server time automatically
        });

        alert("Thank you! Your message has been sent successfully.");
        complaintForm.reset(); // Clear the form mechanism

    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Something went wrong. Please check your internet connection or try again later. \n\nError: " + error.message);
    } finally {
        // Restore button state
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
});
