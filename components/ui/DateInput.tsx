"use client";

import React, { useState, useEffect } from "react";
import { Input, InputProps } from "./Input";

interface DateInputProps extends Omit<InputProps, "value" | "onChange" | "type"> {
    value?: string;
    onChange?: (e: { target: { name?: string; value: string } }) => void;
    /** Pass simple input field props if you dont want the label */
    native?: boolean;
}

export function DateInput({ value, onChange, native, className, ...props }: DateInputProps) {
    const [internalValue, setInternalValue] = useState("");

    // Synchronize incoming YYYY-MM-DD to DD/MM/YYYY
    useEffect(() => {
        if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const [y, m, d] = value.split("T")[0].split("-");
            setInternalValue(`${d}/${m}/${y}`);
        } else if (!value) {
            setInternalValue("");
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value.replace(/\D/g, "");
        if (raw.length > 8) raw = raw.slice(0, 8);

        // Format as DD/MM/YYYY
        let formatted = raw;
        if (raw.length >= 3) {
            formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
        }
        if (raw.length >= 5) {
            formatted = `${formatted.slice(0, 5)}/${raw.slice(4)}`;
        }

        setInternalValue(formatted);

        // If it's a complete length date, try to parse and pass to onChange as YYYY-MM-DD
        if (onChange) {
            if (raw.length === 8) {
                const d = raw.slice(0, 2);
                const m = raw.slice(2, 4);
                const y = raw.slice(4, 8);
                if (Number(d) > 0 && Number(d) <= 31 && Number(m) > 0 && Number(m) <= 12 && Number(y) > 1850) {
                    onChange({ target: { name: props.name, value: `${y}-${m}-${d}` } });
                    return;
                }
            }
            if (raw.length === 0) {
                onChange({ target: { name: props.name, value: "" } });
            }
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (props.onBlur) props.onBlur(e);
        // Optional: could push an empty string if partial
    };

    if (native) {
        return (
            <input
                {...props}
                type="text"
                placeholder="DD/MM/AAAA"
                value={internalValue}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={10}
                className={className || "input-field text-[13px] font-mono"}
            />
        );
    }

    return (
        <Input
            {...props}
            className={className}
            type="text"
            placeholder="DD/MM/AAAA"
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={10}
        />
    );
}
