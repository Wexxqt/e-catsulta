import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAppointmentChartData } from "@/lib/actions/appointment.actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart2,
  LineChart as LineChartIcon,
  TrendingUp,
} from "lucide-react";

// Updated modern color scheme
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

interface AppointmentChartProps {
  className?: string;
}

const AppointmentChart: React.FC<AppointmentChartProps> = ({ className }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalMedical, setTotalMedical] = useState(0);
  const [totalDental, setTotalDental] = useState(0);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [chartType, setChartType] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<"bar" | "line" | "area">("bar");

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const data = await getAppointmentChartData(timeRange);
        
        // Apply aggregation based on chart type
        let processedData = data.chartData;
        
        if (chartType === "weekly" && timeRange === 30) {
          // Group by week for 30-day view
          const weeklyData = [];
          for (let i = 0; i < 5; i++) {
            // 5 weeks
            const weekStart = i * 7;
            const weekEnd = Math.min(weekStart + 6, 29);
            const weekData = data.chartData.slice(weekStart, weekEnd + 1);
            
            const weekSum = {
              date: `Week ${i + 1}`,
              Medical: weekData.reduce((sum, day) => sum + day.Medical, 0),
              Dental: weekData.reduce((sum, day) => sum + day.Dental, 0),
              Total: weekData.reduce((sum, day) => sum + day.Total, 0),
            };
            weeklyData.push(weekSum);
          }
          processedData = weeklyData;
        } else if (chartType === "monthly") {
          // Just show the total for the period
          const monthlyData = [
            {
              date: timeRange === 7 ? "Last 7 days" : "Last 30 days",
            Medical: data.totalMedical,
            Dental: data.totalDental,
              Total: data.totalMedical + data.totalDental,
            },
          ];
          processedData = monthlyData;
        }
        
        setChartData(processedData);
        setTotalMedical(data.totalMedical);
        setTotalDental(data.totalDental);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [timeRange, chartType]);

  // For pie chart data
  const pieData = [
    { name: "Medical", value: totalMedical },
    { name: "Dental", value: totalDental },
  ];

  // Get the current theme mode for chart text color
  const isDarkMode =
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  // Define colors based on theme
  const axisColor = isDarkMode ? "#888888" : "#555555";
  const axisTickColor = isDarkMode ? "#888888" : "#555555";
  const gridColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const labelColor = isDarkMode ? "#ffffff" : "#333333";

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-500 dark:text-muted-foreground">
              Loading chart data...
            </p>
          </div>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-muted-foreground">
          No appointment data available
        </div>
      );
    }

    if (viewType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [
                `${value} appt${value !== 1 ? "s" : ""}`,
                null,
              ]}
              contentStyle={{
                backgroundColor: isDarkMode
                  ? "rgba(25,25,26,0.95)"
                  : "rgba(255,255,255,0.95)",
                border: "none",
                borderRadius: "6px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
              labelStyle={{
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{
                paddingTop: 10,
              }}
              formatter={(value) => (
                <span style={{ color: isDarkMode ? "#ffffff" : "#333333" }}>
                  {value}
                </span>
              )}
            />
            <Bar
              dataKey="Medical"
              stackId="a"
              fill={COLORS[0]}
              name="Medical"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Dental"
              stackId="a"
              fill={COLORS[1]}
              name="Dental"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (viewType === "line") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [
                `${value} appt${value !== 1 ? "s" : ""}`,
                null,
              ]}
              contentStyle={{
                backgroundColor: isDarkMode
                  ? "rgba(25,25,26,0.95)"
                  : "rgba(255,255,255,0.95)",
                border: "none",
                borderRadius: "6px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
              labelStyle={{
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
            />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span style={{ color: isDarkMode ? "#ffffff" : "#333333" }}>
                  {value}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="Medical"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={{ stroke: COLORS[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="Dental"
              stroke={COLORS[1]}
              strokeWidth={2}
              dot={{ stroke: COLORS[1], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: COLORS[1], strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />
            <XAxis
              dataKey="date"
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
            />
            <YAxis
              stroke={axisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTickColor }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value) => [
                `${value} appt${value !== 1 ? "s" : ""}`,
                null,
              ]}
              contentStyle={{
                backgroundColor: isDarkMode
                  ? "rgba(25,25,26,0.95)"
                  : "rgba(255,255,255,0.95)",
                border: "none",
                borderRadius: "6px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
              labelStyle={{
                color: isDarkMode ? "#ffffff" : "#333333",
              }}
            />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span style={{ color: isDarkMode ? "#ffffff" : "#333333" }}>
                  {value}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="Medical"
              stackId="1"
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.4}
            />
            <Area
              type="monotone"
              dataKey="Dental"
              stackId="1"
              stroke={COLORS[1]}
              fill={COLORS[1]}
              fillOpacity={0.4}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <div className="flex items-center space-x-4">
          <Tabs
            defaultValue={chartType}
            onValueChange={(value) =>
              setChartType(value as "daily" | "weekly" | "monthly")
            }
          >
            <TabsList className="bg-gray-100 dark:bg-dark-300">
              <TabsTrigger
                value="daily"
                className="px-3 py-1 text-sm data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
              >
                Daily
              </TabsTrigger>
              <TabsTrigger
                value="weekly"
                className="px-3 py-1 text-sm data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
              >
                Weekly
              </TabsTrigger>
              <TabsTrigger
                value="monthly"
                className="px-3 py-1 text-sm data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
              >
                Monthly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time Range Toggles */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-dark-200 rounded-md p-0.5">
            <Button 
              variant={timeRange === 7 ? "default" : "ghost"}
              onClick={() => setTimeRange(7)} 
              size="sm"
              className="text-xs py-1 h-7"
            >
              7 Days
            </Button>
            <Button 
              variant={timeRange === 30 ? "default" : "ghost"}
              onClick={() => setTimeRange(30)} 
              size="sm"
              className="text-xs py-1 h-7"
            >
              30 Days
            </Button>
          </div>
          
          {/* View Type Toggles */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-dark-200 rounded-md p-0.5">
            <Button 
              variant={viewType === "bar" ? "default" : "ghost"}
              onClick={() => setViewType("bar")}
              size="sm"
              className="text-xs py-1 h-7"
            >
              <BarChart2 className="h-3.5 w-3.5 mr-1" />
              Bar
            </Button>
            <Button 
              variant={viewType === "line" ? "default" : "ghost"}
              onClick={() => setViewType("line")}
              size="sm"
              className="text-xs py-1 h-7"
            >
              <LineChartIcon className="h-3.5 w-3.5 mr-1" />
              Line
            </Button>
            <Button 
              variant={viewType === "area" ? "default" : "ghost"}
              onClick={() => setViewType("area")}
              size="sm"
              className="text-xs py-1 h-7"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Area
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-[350px] bg-white dark:bg-transparent rounded-lg p-2">
              {renderChart()}
            </div>

      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="flex flex-col items-center justify-center bg-white dark:bg-dark-300 p-4 rounded-lg border border-gray-200 dark:border-dark-400">
            <h4 className="text-sm font-medium text-gray-500 dark:text-muted-foreground mb-4">
              Appointment Distribution
            </h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                  labelLine
                  label={({ name, percent, x, y, midAngle }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = 80;
                    const outerRadius = 100;
                    const innerRadius = 60;
                    const cx = parseInt(String(x));
                    const cy = parseInt(String(y));
                    const midRadius =
                      innerRadius + (outerRadius - innerRadius) * 0.5;
                    const sin = Math.sin(-RADIAN * midAngle);
                    const cos = Math.cos(-RADIAN * midAngle);
                    const sx = cx + (outerRadius + 10) * cos;
                    const sy = cy + (outerRadius + 10) * sin;
                    const mx = cx + (midRadius + 10) * cos;
                    const my = cy + (midRadius + 10) * sin;
                    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
                    const ey = my;
                    const textAnchor = cos >= 0 ? "start" : "end";

                    return (
                      <g>
                        <text
                          x={sx}
                          y={sy}
                          fill={isDarkMode ? "#FFFFFF" : "#333333"}
                          textAnchor={textAnchor}
                          dominantBaseline="central"
                          fontSize={12}
                        >
                          {`${name}: ${(percent * 100).toFixed(0)}%`}
                        </text>
                      </g>
                    );
                  }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                    ))}
                  </Pie>
                <Tooltip
                  formatter={(value) => [`${value} appointments`, null]}
                  contentStyle={{
                    backgroundColor: isDarkMode
                      ? "rgba(25,25,26,0.95)"
                      : "rgba(255,255,255,0.95)",
                    border: "none",
                    borderRadius: "6px",
                    color: isDarkMode ? "#ffffff" : "#333333",
                  }}
                />
                </PieChart>
              </ResponsiveContainer>
            <div className="flex gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[0] }}
                ></div>
                <span className="text-sm text-gray-900 dark:text-white">
                  Medical: {totalMedical}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[1] }}
                ></div>
                <span className="text-sm text-gray-900 dark:text-white">
                  Dental: {totalDental}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-300 p-4 rounded-lg border border-gray-200 dark:border-dark-400">
            <h4 className="text-sm font-medium text-gray-500 dark:text-muted-foreground mb-2">
              Key Statistics
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-muted-foreground">
                    Medical Appointments
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totalMedical}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${
                        totalMedical + totalDental > 0
                          ? (totalMedical / (totalMedical + totalDental)) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-muted-foreground">
                    Dental Appointments
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totalDental}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        totalMedical + totalDental > 0
                          ? (totalDental / (totalMedical + totalDental)) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-muted-foreground">
                    Total
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totalMedical + totalDental}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                    style={{ width: "100%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
      </div>
      )}
    </div>
  );
};

export default AppointmentChart; 
