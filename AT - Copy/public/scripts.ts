let swiper;
let tasksData = {};
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const totalDays = new Date(currentYear, currentMonth, 0).getDate();

document.addEventListener('DOMContentLoaded', async () => {
  await fetchTasks();
  initializeSwiper();
  initializeCharts();
  document
    .getElementById('addTaskBtn')
    .addEventListener('click', addTaskHandler);
  document
    .getElementById('addToAllDaysBtn')
    .addEventListener('click', addTaskToAllDaysHandler);
  document.getElementById('logoutBtn').addEventListener('click', logoutHandler);
});

async function fetchTasks() {
  const response = await fetch(`/api/tasks/${currentYear}/${currentMonth}`);
  tasksData = await response.json();
}

function initializeSwiper() {
  const daysContainer = document.getElementById('daysContainer');
  for (let day = 1; day <= totalDays; day++) {
    const slide = document.createElement('div');
    slide.classList.add('swiper-slide');
    slide.innerHTML = `<h3>Day ${day}</h3><ul class="task-list" id="day-${day}"></ul>`;
    daysContainer.appendChild(slide);
    populateTasks(day);
  }

  swiper = new Swiper('.swiper-container', {
    initialSlide: currentDate.getDate() - 1,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });
}

function populateTasks(day) {
  const taskList = document.getElementById(`day-${day}`);
  taskList.innerHTML = '';
  const tasks = tasksData[day] || [];
  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.textContent = task.text;
    li.classList.toggle('completed', task.completed);
    li.addEventListener('click', () => toggleTask(task.id, day));
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id, day);
    });
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

async function addTaskHandler() {
    const text = document.getElementById('taskText').value.trim();
    const daysInput = document.getElementById('taskDays').value.trim();
    if (!text || !daysInput) return;
    const days = daysInput.split(',').map((d) => parseInt(d.trim(), 10));
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, days })
    });
    const result = await response.json();
    if (result.success) {
      await fetchTasks();
      days.forEach((day) => populateTasks(day));
      Toastify({ text: 'Task added successfully!', duration: 3000 }).showToast();
      document.getElementById('taskText').value = '';
      document.getElementById('taskDays').value = '';
      updateCharts();
    }
  }  

async function addTaskToAllDaysHandler() {
  const text = document.getElementById('taskText').value.trim();
  if (!text) return;
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, addToAllDays: true })
  });
  const result = await response.json();
  if (result.success) {
    await fetchTasks();
    for (let day = 1; day <= totalDays; day++) {
      populateTasks(day);
    }
    Toastify({ text: 'Task added to all days!', duration: 3000 }).showToast();
  }
}

async function toggleTask(taskId, day) {
  const response = await fetch(`/api/tasks/${taskId}/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ year: currentYear, month: currentMonth, day })
  });
  const result = await response.json();
  if (result.success) {
    await fetchTasks();
    populateTasks(day);
    updateCharts();
  }
}

async function deleteTask(taskId, day) {
  const response = await fetch(`/api/tasks/${taskId}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ year: currentYear, month: currentMonth, day })
  });
  const result = await response.json();
  if (result.success) {
    await fetchTasks();
    populateTasks(day);
    updateCharts();
  }
}

function logoutHandler() {
  fetch('/logout', { method: 'POST' }).then(() => {
    window.location.href = '/login.html';
  });
}

let tasksCompletedChart;
let tasksPercentageChart;

function initializeCharts() {
  const ctx1 = document.getElementById('tasksCompletedChart').getContext('2d');
  const ctx2 = document.getElementById('tasksPercentageChart').getContext('2d');

  tasksCompletedChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: Array.from({ length: totalDays }, (_, i) => i + 1),
      datasets: [
        {
          label: 'Tasks Completed',
          data: getTasksCompletedData(),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
      ],
    },
  });

  tasksPercentageChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: Array.from({ length: totalDays }, (_, i) => i + 1),
      datasets: [
        {
          label: 'Tasks Completion Percentage',
          data: getTasksPercentageData(),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        },
      ],
    },
  });
}

function updateCharts() {
  tasksCompletedChart.data.datasets[0].data = getTasksCompletedData();
  tasksCompletedChart.update();

  tasksPercentageChart.data.datasets[0].data = getTasksPercentageData();
  tasksPercentageChart.update();
}

function getTasksCompletedData() {
  return Array.from({ length: totalDays }, (_, day) => {
    const tasks = tasksData[day + 1] || [];
    return tasks.filter((t) => t.completed).length;
  });
}

function getTasksPercentageData() {
  return Array.from({ length: totalDays }, (_, day) => {
    const tasks = tasksData[day + 1] || [];
    const completed = tasks.filter((t) => t.completed).length;
    return tasks.length ? (completed / tasks.length) * 100 : 0;
  });
}
