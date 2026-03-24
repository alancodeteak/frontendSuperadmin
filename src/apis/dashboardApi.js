const mockDashboardData = {
  members: [
    { id: 1, name: 'Alex Carter', role: 'Product Designer', avatar: 'AC', status: 'Online', progress: 82 },
    { id: 2, name: 'Riya Sharma', role: 'Frontend Engineer', avatar: 'RS', status: 'Away', progress: 68 },
    { id: 3, name: 'Noah Wilson', role: 'Project Manager', avatar: 'NW', status: 'Online', progress: 91 },
    { id: 4, name: 'Maya Lopez', role: 'QA Engineer', avatar: 'ML', status: 'Offline', progress: 53 },
  ],
  stats: [
    { id: 'projects', label: 'Active Projects', value: '18', delta: '+12%' },
    { id: 'tasks', label: 'Tasks Completed', value: '1,426', delta: '+8%' },
    { id: 'hours', label: 'Team Hours', value: '274h', delta: '+4%' },
    { id: 'satisfaction', label: 'Satisfaction', value: '96%', delta: '+2%' },
  ],
}

export async function fetchDashboardData() {
  await new Promise((resolve) => {
    setTimeout(resolve, 350)
  })
  return mockDashboardData
}
