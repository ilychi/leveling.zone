import React from "react";

export default function ParticlesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="particles-layout">
      {children}
    </div>
  );
}
