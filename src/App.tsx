import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import Home from "@/scenes/home";
import OurClasses from "@/scenes/ourClasses";
import Benefits from "@/scenes/benefits";
import ContactUs from "@/scenes/contactUs";
import Footer from "@/scenes/footer";
import { SelectedPage } from "@/shared/types";
import Navbar from "./scenes/navbar";

function App() {
  const [selectedPage, setSelectedPage] = useState<SelectedPage>(
    SelectedPage.Home
  );
  const [isTopOfPage, setIsTopOfPage] = useState<boolean>(true);

  // handle scroll (cleaned up with useEffect)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY === 0) {
        setIsTopOfPage(true);
        setSelectedPage(SelectedPage.Home);
      } else {
        setIsTopOfPage(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="app bg-gray-20">
      <Navbar
        isTopOfPage={isTopOfPage}
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Dashboard placeholder */}
        <Route path="/dashboard" element={<div>Dashboard Placeholder</div>} />

        {/* Default homepage with sections */}
        <Route
          path="/"
          element={
            <>
              <Home setSelectedPage={setSelectedPage} />
              <Benefits setSelectedPage={setSelectedPage} />
              <OurClasses setSelectedPage={setSelectedPage} />
              <ContactUs setSelectedPage={setSelectedPage} />
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
