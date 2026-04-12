const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TaskBridge API is running.");
});

app.post("/api/tasks", (req, res) => {
  const { title, description, course, dueDate, priority, status } = req.body;

  const sql = `
    INSERT INTO tasks (title, description, course, dueDate, priority, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      title,
      description || "",
      course || "",
      dueDate || "",
      priority || "Medium",
      status || "Pending"
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "Task created successfully",
        taskId: this.lastID
      });
    }
  );
});

app.get("/api/tasks", (req, res) => {
  const sql = `SELECT * FROM tasks ORDER BY dueDate ASC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

app.get("/api/tasks/:id", (req, res) => {
  const { id } = req.params;

  const sql = `SELECT * FROM tasks WHERE id = ?`;

  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(row);
  });
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, course, dueDate, priority, status } = req.body;

  const sql = `
    UPDATE tasks
    SET title = ?, description = ?, course = ?, dueDate = ?, priority = ?, status = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [title, description, course, dueDate, priority, status, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json({ message: "Task updated successfully" });
    }
  );
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM tasks WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
