import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface DailyCommitChartProps {
    commitData: number[];
}

const DailyCommitChart: React.FC<DailyCommitChartProps> = ({ commitData }) => {
    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Commits by Day of Week',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                }
            }
        }
    };

    const data = {
        labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        datasets: [
            {
                data: commitData,
                backgroundColor: 'rgba(74, 108, 247, 0.6)',
                borderColor: 'rgba(74, 108, 247, 1)',
                borderWidth: 1,
            },
        ],
    };

    return <Bar options={options} data={data} />;
};

export default DailyCommitChart;
