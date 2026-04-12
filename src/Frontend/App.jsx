import React, { useEffect, useState } from "react";

function App() {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "",
    dueDate: "",
    priority: "Medium",
    status: "Pending"
  });

  const fetchTasks = async () => {
    const res = await fetch("http://localhost:5000/api/tasks");
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("http://localhost:5000/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    setFormData({
      title: "",
      description: "",
      course: "",
      dueDate: "",
      priority: "Medium",
      status: "Pending"
    });

    fetchTasks();
  };

  const deleteTask = async (id) => {
    await fetch(`http://localhost:5000/api/tasks/${id}`, {
      method: "DELETE"
    });
    fetchTasks();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>TaskBridge</h1>

      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Task title" value={formData.title} onChange={handleChange} required />
        <br /><br />
        <input name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
        <br /><br />
        <input name="course" placeholder="Course" value={formData.course} onChange={handleChange} />
        <br /><br />
        <input name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
        <br /><br />
        <select name="priority" value={formData.priority} onChange={handleChange}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <br /><br />
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <br /><br />
        <button type="submit">Add Task</button>
      </form>

      <hr />

      <h2>All Tasks</h2>
      {tasks.map((task) => (
        <div key={task.id} style={{ border: "1px solid #ccc", marginBottom: "10px", padding: "10px" }}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <p><strong>Course:</strong> {task.course}</p>
          <p><strong>Due Date:</strong> {task.dueDate}</p>
          <p><strong>Priority:</strong> {task.priority}</p>
          <p><strong>Status:</strong> {task.status}</p>
          <button onClick={() => deleteTask(task.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default App;
