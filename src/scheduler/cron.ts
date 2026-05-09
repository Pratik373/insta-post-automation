import cron from "node-cron";
import { runAutomation } from "../index";

const task = cron.schedule(
  "30 3 * * *",
  async () => {
    console.log("Starting scheduled Instagram AI/tech news automation run...");
    try {
      await runAutomation();
    } catch (error) {
      console.error("Scheduled automation run failed:", error);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);

task.start();
console.log("Scheduler active. Automation will run daily at 9:00 AM IST.");
