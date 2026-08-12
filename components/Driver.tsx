"use client";

interface DriverProps {
  label: string;
  value?: number;
}

export default function Driver({ label, value }: DriverProps) {
  const percent = Math.round((value || 0) * 100);

  return (
    <div className="driver-row">
      <span>{label}</span>

      <div className="driver-bar">
        <div
          className="driver-fill"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <strong>{percent}%</strong>
    </div>
  );
}
