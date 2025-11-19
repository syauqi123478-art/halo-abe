const express = require('express')

const app = express()

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/pages/halo.html");
});

app.get('/daftar', (req, res) => {
    res.sendFile(__dirname + "/pages/halo.html");
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + "/pages/login.html");
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + "/pages/register.html");
});

app.get('/public/:file', (req, res) => {
    res.sendFile(__dirname + "/public/" + req.params.file)
})

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://anyylsedulbqhtsxteej.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueXlsc2VkdWxicWh0c3h0ZWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI1NDA2NCwiZXhwIjoyMDc4ODMwMDY0fQ.V_3FdZZpsfmXTSsxbROgXHk499XbnQQvB-tSg_VzbbI"; // gunakan service role key di backend
const supabase = createClient(supabaseUrl, supabaseKey);

// REGISTER
app.post("/register", async (req, res) => {
  console.log("Register request body:", req.body);
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: "Semua field harus diisi" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // pakai service key, RLS tidak akan mencegah insert
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, email, password: hashedPassword }])
      .select();

    console.log("Insert result:", data, error);

    if (error) return res.status(500).json({ error: JSON.stringify(error) });

    res.json({ message: "Registrasi berhasil!", data: data[0] });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Email dan password harus diisi" });

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) return res.status(500).json({ error: JSON.stringify(error) });
    if (!users || users.length === 0) return res.status(400).json({ error: "Email tidak terdaftar" });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(400).json({ error: "Password salah" });

    res.json({
      message: "Login berhasil!",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// app.listen(8080, () => {
//     console.log("http://localhost:8080/")
// })

module.exports = app;