import { useState } from 'react';
import BackgroundEffects from '../components/BackgroundEffects';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import LoginModal from '../components/LoginModal';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState('STUDENT');

  const handleOpenModal = (mode) => {
    setLoginMode(mode);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <BackgroundEffects />
      <div className="app-container">
        <Navbar />
        <Hero onOpenModal={handleOpenModal} />
        <LoginModal 
          mode={loginMode} 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
        />
      </div>
    </>
  );
}
