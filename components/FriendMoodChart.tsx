"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";
import type { MoodTrendPoint } from "@/lib/api/friends";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

interface FriendMoodChartProps {
  data: MoodTrendPoint[];
}

export default function FriendMoodChart({ data }: FriendMoodChartProps) {
  const chartData = {
    labels: data.map((item) =>
      new Date(item.day).toLocaleDateString("en-US", {
        weekday: "short",
      }),
    ),

    datasets: [
      {
        label: "Mood Score",
        data: data.map((item) => Number(item.avg_score)),
        borderColor: "#1E3A5F",
        backgroundColor: "rgba(30,58,95,.18)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,

    plugins: {
      legend: {
        display: false,
      },
    },

    scales: {
      y: {
        min: 0,
        max: 100,
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
