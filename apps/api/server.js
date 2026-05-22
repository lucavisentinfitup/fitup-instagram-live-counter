import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/api/followers", async (req, res) => {
  res.json({
    username: "fitup.it",
    followers: 8079,
    updatedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
