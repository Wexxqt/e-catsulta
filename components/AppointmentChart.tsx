import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { getAppointmentChartData } from '@/lib/actions/appointment.actions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface AppointmentChartProps {
  className?: string;
}

const AppointmentChart: React.FC<AppointmentChartProps> = ({ className }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalMedical, setTotalMedical] = useState(0);
  const [totalDental, setTotalDental] = useState(0);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [chartType, setChartType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'bar' | 'line' | 'area'>('bar');

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const data = await getAppointmentChartData(timeRange);
        
        // Apply aggregation based on chart type
        let processedData = data.chartData;
        
        if (chartType === 'weekly' && timeRange === 30) {
          // Group by week for 30-day view
          const weeklyData = [];
          for (let i = 0; i < 5; i++) { // 5 weeks
            const weekStart = i * 7;
            const weekEnd = Math.min(weekStart + 6, 29);
            const weekData = data.chartData.slice(weekStart, weekEnd + 1);
            
            const weekSum = {
              date: `Week ${i+1}`,
              Medical: weekData.reduce((sum, day) => sum + day.Medical, 0),
              Dental: weekData.reduce((sum, day) => sum + day.Dental, 0),
              Total: weekData.reduce((sum, day) => sum + day.Total, 0)
            };
            weeklyData.push(weekSum);
          }
          processedData = weeklyData;
        } else if (chartType === 'monthly') {
          // Just show the total for the period
          const monthlyData = [{
            date: timeRange === 7 ? 'Last 7 days' : 'Last 30 days',
            Medical: data.totalMedical,
            Dental: data.totalDental,
            Total: data.totalMedical + data.totalDental
          }];
          processedData = monthlyData;
        }
        
        setChartData(processedData);
        setTotalMedical(data.totalMedical);
        setTotalDental(data.totalDental);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [timeRange, chartType]);

  // For pie chart data
  const pieData = [
    { name: 'Medical', value: totalMedical },
    { name: 'Dental', value: totalDental },
  ];

  const renderChart = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-64">Loading chart data...</div>;
    }

    if (chartData.length === 0) {
      return <div className="flex items-center justify-center h-64">No appointment data available</div>;
    }

    if (viewType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} appt${value !== 1 ? 's' : ''}`, null]} />
            <Legend />
            <Bar dataKey="Medical" stackId="a" fill="#0088FE" name="Medical" />
            <Bar dataKey="Dental" stackId="a" fill="#00C49F" name="Dental" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (viewType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} appt${value !== 1 ? 's' : ''}`, null]} />
            <Legend />
            <Line type="monotone" dataKey="Medical" stroke="#0088FE" activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Dental" stroke="#00C49F" activeDot={{ r: 8 }} />
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} appt${value !== 1 ? 's' : ''}`, null]} />
            <Legend />
            <Area type="monotone" dataKey="Medical" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Dental" stackId="1" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className={`bg-dark-300 p-6 rounded-lg border border-dark-400 shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-white">Appointment Trends</h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Time Range Toggles */}
          <div className="flex items-center space-x-2 bg-dark-400 rounded-md p-1">
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
          <div className="flex items-center space-x-2 bg-dark-400 rounded-md p-1">
            <Button 
              variant={viewType === 'bar' ? "default" : "ghost"}
              onClick={() => setViewType('bar')} 
              size="sm"
              className="text-xs py-1 h-7"
            >
              Bar
            </Button>
            <Button 
              variant={viewType === 'line' ? "default" : "ghost"}
              onClick={() => setViewType('line')} 
              size="sm"
              className="text-xs py-1 h-7"
            >
              Line
            </Button>
            <Button 
              variant={viewType === 'area' ? "default" : "ghost"}
              onClick={() => setViewType('area')} 
              size="sm"
              className="text-xs py-1 h-7"
            >
              Area
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="daily" onValueChange={(value) => setChartType(value as any)}>
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="h-[350px]">
          {renderChart()}
        </TabsContent>
        
        <TabsContent value="weekly" className="h-[350px]">
          {renderChart()}
        </TabsContent>
        
        <TabsContent value="monthly" className="h-[350px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <div>
              {renderChart()}
            </div>
            <div className="flex flex-col items-center justify-center">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Category Breakdown</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} appointments`, null]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#0088FE]"></div>
                  <span className="text-xs text-gray-400">Medical: {totalMedical}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#00C49F]"></div>
                  <span className="text-xs text-gray-400">Dental: {totalDental}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-4 text-xs text-gray-400">
        <span>Total Medical: {totalMedical}</span>
        <span>Total Dental: {totalDental}</span>
        <span>Total: {totalMedical + totalDental}</span>
      </div>
    </div>
  );
};

export default AppointmentChart; 