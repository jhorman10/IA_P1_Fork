"use client";

import { useState } from "react";
import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";
import styles from "./AppointmentRegistrationForm.module.css";
import { sanitizeText } from "@/security/sanitize";

/**
 * 🛡️ HUMAN CHECK:
 * UI component for appointment registration.
 */
export default function AppointmentRegistrationForm() {
    const [fullName, setFullName] = useState("");
    const [idCard, setIdCard] = useState("");
    const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

    const { register, loading, success, error } = useAppointmentRegistration();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const safeFullName = sanitizeText(fullName);
        const safeIdCard = sanitizeText(idCard);

        const validIdCard = parseInt(safeIdCard, 10);
        if (!safeFullName || isNaN(validIdCard)) return;

        await register({ fullName: safeFullName, idCard: validIdCard, priority });
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Register Appointment</h2>

            <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={styles.input}
            />

            <input
                type="text"
                placeholder="ID Card Number"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                className={styles.input}
            />

            <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
                className={styles.input}
            >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
            </select>

            <button disabled={loading} className={styles.button}>
                {loading ? "Sending..." : "Register Now"}
            </button>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
}
