import "./App.css";
import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import Success from "./Success";
import Failure from "./Failure";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Failure />} />
      </Routes>
    </>
  );
}

export default App;
