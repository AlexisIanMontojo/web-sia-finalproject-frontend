import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const PALETTE = ['#172b3a', '#c6a76a', '#356c88', '#236b52', '#a33e3e', '#92999c'];

export default function ChartCard({
  title,
  type = 'bar',
  labels,
  values,
  accent = 'navy',
  formatValue = (value) => value,
}) {
  const hasData = values.some((v) => v > 0);
  const isLine = type === 'line';
  const lineColor = accent === 'gold' ? '#b29355' : '#172b3a';

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: type === 'doughnut'
        ? PALETTE
        : (isLine ? (accent === 'gold' ? 'rgba(198, 167, 106, 0.14)' : 'rgba(23, 43, 58, 0.08)') : '#d6c49c'),
      borderColor: isLine ? lineColor : 'transparent',
      borderRadius: type === 'bar' ? 3 : 0,
      borderWidth: isLine ? 2 : 0,
      pointBackgroundColor: lineColor,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: isLine ? 3 : 0,
      fill: isLine,
      tension: 0.28,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: type === 'doughnut', position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => formatValue(context.parsed.y ?? context.parsed ?? context.raw),
        },
      },
    },
    scales: type === 'doughnut' ? undefined : {
      x: { grid: { display: false }, ticks: { color: '#727b81', maxRotation: 0, autoSkip: true } },
      y: {
        beginAtZero: true,
        grid: { color: '#eee9e0' },
        ticks: { color: '#727b81', callback: (value) => formatValue(value) },
      },
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
        ) : type === 'line' ? (
          <Line data={data} options={options} />
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
}