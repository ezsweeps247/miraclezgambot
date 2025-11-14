import "@fontsource/roboto";
import { GameCanvas } from "./components/GameCanvas";
import { GameUI } from "./components/GameUI";
import { SoundManager } from "./components/SoundManager";

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      background: '#f8f8f8'
    }}>
      <GameCanvas />
      <GameUI />
      <SoundManager />
    </div>
  );
}

export default App;
