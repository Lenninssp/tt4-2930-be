const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const app = require("./app");

const startServer = async () => {
    try{
        await connectDB();

        app.listen(3000, ()=>{
            console.log("Server is running...");
        });
    }catch(error){
        console.error("Failed to start server", error);
        process.exit(1);
    }
};

startServer();