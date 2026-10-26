import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PALETTE = ['#174d38', '#f5c542', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function ChartCard({ title, type = 'bar', labels, values }) {
  const hasData = values.some((v) => v > 0);

  const data = {
    labels,
    datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 6, borderWidth: 0 }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: type === 'doughnut', position: 'bottom' },
    },
  };

  return (
    <div className="admin-card chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-box">
        {!hasData ? (
          <p className="chart-empty">No data yet</p>
        ) : type === 'doughnut' ? (
          <Doughnut data={data} options={options} />
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
}