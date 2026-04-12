import { TaskChallenge, TaskStation, TaskType, TOTAL_TASKS } from './types';

const EMAIL_TOPICS = [
  'Request supplies from Earth',
  'Report oxygen levels',
  'Schedule rover maintenance',
  'Update crew on weather',
  'Request medical supplies',
  'Report mineral findings',
  'Alert about dust storm',
  'Confirm food inventory',
  'Request fuel delivery',
  'Report solar panel status',
];

const TASK_LABELS: Record<TaskType, string> = {
  math: 'Calculate',
  temperature: 'Adj. Temp',
  email: 'Send Email',
  scan: 'Scan Data',
};

export function createTaskStations(): TaskStation[] {
  const positions = [
    // Research room (top center, inside 550-1050, 40-340)
    { x: 680, y: 150 }, { x: 850, y: 200 }, { x: 950, y: 120 },
    // Ecosystem room (left, inside 40-390, 450-800)
    { x: 150, y: 550 }, { x: 280, y: 680 }, { x: 150, y: 730 },
    // Recover room (right, inside 1210-1560, 450-800)
    { x: 1320, y: 550 }, { x: 1450, y: 680 },
    // Open area
    { x: 800, y: 900 }, { x: 500, y: 1050 },
  ];

  const types: TaskType[] = ['math', 'math', 'temperature', 'temperature',
    'email', 'email', 'scan', 'scan', 'math', 'temperature'];

  return positions.slice(0, TOTAL_TASKS).map((pos, i) => ({
    id: i,
    x: pos.x,
    y: pos.y,
    label: TASK_LABELS[types[i]],
    taskType: types[i],
    completed: false,
  }));
}

export function generateTaskChallenge(station: TaskStation): TaskChallenge {
  switch (station.taskType) {
    case 'math': {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 15) + 1;
      const c = Math.floor(Math.random() * 10) + 1;
      const ops = ['+', '-'];
      const op1 = ops[Math.floor(Math.random() * 2)];
      const op2 = ops[Math.floor(Math.random() * 2)];
      const expr = `${a} ${op1} ${b} ${op2} ${c}`;
      const result = eval(expr) as number;
      return { type: 'math', stationId: station.id, prompt: `Solve: ${expr}`, answer: String(result) };
    }
    case 'temperature': {
      const target = Math.floor(Math.random() * 30) + 15;
      return { type: 'temperature', stationId: station.id, prompt: `Set temperature to ${target}°C`, answer: '', targetTemp: target };
    }
    case 'email': {
      const topic = EMAIL_TOPICS[Math.floor(Math.random() * EMAIL_TOPICS.length)];
      return { type: 'email', stationId: station.id, prompt: `Write a 1-line email about:`, answer: '', topic };
    }
    case 'scan': {
      return { type: 'scan', stationId: station.id, prompt: 'Scanning data...', answer: '', duration: 4500 };
    }
  }
}
