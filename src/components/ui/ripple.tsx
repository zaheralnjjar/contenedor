import React, { useState, useLayoutEffect } from "react";

interface RippleType {
    x: number;
    y: number;
    size: number;
}

export const Ripple = () => {
    const [rippleArray, setRippleArray] = useState<RippleType[]>([]);

    useLayoutEffect(() => {
        let bounce: number | undefined;
        if (rippleArray.length > 0) {
            clearTimeout(bounce);
            bounce = window.setTimeout(() => {
                setRippleArray([]);
                clearTimeout(bounce);
            }, 500); // Wait for the ripple animation to complete
        }
        return () => clearTimeout(bounce);
    }, [rippleArray.length]);

    const addRipple = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rippleContainer = event.currentTarget.getBoundingClientRect();
        const size =
            rippleContainer.width > rippleContainer.height
                ? rippleContainer.width
                : rippleContainer.height;
        const x = event.clientX - rippleContainer.x - size / 2;
        const y = event.clientY - rippleContainer.y - size / 2;
        const ObjectX = { x, y, size };

        setRippleArray((prev) => [...prev, ObjectX]);
    };

    return (
        <div
            className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none"
            onMouseDown={addRipple}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                addRipple({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    currentTarget: e.currentTarget,
                } as any);
            }}
            style={{ pointerEvents: 'auto' }} /* Ensure it can receive clicks */
        >
            {rippleArray.length > 0 &&
                rippleArray.map((ripple, index) => (
                    <span
                        key={"span" + index}
                        style={{
                            top: ripple.y,
                            left: ripple.x,
                            width: ripple.size,
                            height: ripple.size,
                            transform: "scale(0)",
                        }}
                        className="absolute rounded-full bg-current opacity-20 pointer-events-none animate-ripple"
                    />
                ))}
        </div>
    );
};
