import React, { useState, useEffect, useRef } from 'react';
import { SERVER_URL } from '@/constants/server-url';

// Define types used throughout the application. Feel free to extend these as you add
// more features.
type Ability = {
  name: string;
  damage?: number;
  heal?: number;
};

type User = {
  name: string;
  creatureImage: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  abilities: Ability[];
  evolutionPoints?: number;
};

type Boss = {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  abilities: Ability[];
  image: string;
};

type BattleState = {
  id: string;
  type: 'boss' | 'multiplayer';
  players: any[];
  turn: number;
  status: string;
  log: string[];
  winner?: string;
};

// Canvas component encapsulates drawing functionality. You can extend this
// implementation to add more tools, shapes and undo/redo if needed.
function Canvas({ image, onChange }: { image?: string; onChange: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<'draw' | 'erase' | 'circle' | 'square'>('draw');
  const undoStack = useRef<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    // Initialize the canvas background to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (image) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = `${SERVER_URL}/api/image/${image}`;
    }
  }, [image]);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    undoStack.current.push(canvas.toDataURL());
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool === 'circle') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      onChange();
      return;
    }
    if (tool === 'square') {
      ctx.fillStyle = color;
      ctx.fillRect(x - size, y - size, size * 4, size * 4);
      onChange();
      return;
    }
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = tool === 'erase' ? 'white' : color;
    ctx.lineTo(x, y);
    ctx.stroke();
    onChange();
  };
  const endDrawing = () => {
    setDrawing(false);
  };
  const reset = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    undoStack.current = [];
    onChange();
  };
  const undo = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dataUrl = undoStack.current.pop();
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        onChange();
      };
      img.src = dataUrl;
    }
  };
  return (
    <div className="flex flex-col items-center">
      <div className="border border-black mb-2">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
        />
      </div>
      <div className="flex items-center mb-2">
        <button
          className={`w-8 h-8 rounded-full mr-2 ${tool === 'draw' ? 'border-2 border-blue-500' : ''}`}
          onClick={() => setTool('draw')}
        >🖊️</button>
        <button
          className={`w-8 h-8 rounded-full mr-2 ${tool === 'erase' ? 'border-2 border-blue-500' : ''}`}
          onClick={() => setTool('erase')}
        >🧽</button>
        <button
          className={`w-8 h-8 rounded-full mr-2 ${tool === 'circle' ? 'border-2 border-blue-500' : ''}`}
          onClick={() => setTool('circle')}
        >⭕</button>
        <button
          className={`w-8 h-8 rounded-full mr-2 ${tool === 'square' ? 'border-2 border-blue-500' : ''}`}
          onClick={() => setTool('square')}
        >◼️</button>
        <select
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value))}
          className="border border-gray-300 p-1 rounded mr-2"
        >
          <option value={2}>Small</option>
          <option value={5}>Medium</option>
          <option value={8}>Large</option>
        </select>
        <div className="flex space-x-1 mr-2">
          {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'].map((c) => (
            <button
              key={c}
              className={`w-6 h-6 border ${color === c ? 'border-black' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            ></button>
          ))}
        </div>
        <button onClick={undo} className="border px-2 py-1 mr-2 bg-gray-100">Undo</button>
        <button onClick={reset} className="border px-2 py-1 bg-gray-100">Clear</button>
      </div>
    </div>
  );
}

// Your top level application component. We route between views by toggling the
// `view` state. Feel free to refactor into multiple components once the file
// grows larger.
export default function App() {
  const [view, setView] = useState<'enter' | 'editor' | 'menu' | 'bosses' | 'battle' | 'rules' | 'multiplayer' | 'create' | 'join' | 'lobby'>('enter');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);

  // Variables for polling are intentionally unused because polling logic lives in useEffect.
  const [matchCode, setMatchCode] = useState<string>('');

  const handleEnter = async (name: string) => {
    setLoading(true);
    const response = await fetch(`${SERVER_URL}/api/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      alert('Failed to enter name');
      setLoading(false);
      return;
    }
    const userData: any = await response.json();
    setUser(userData);
    if (!userData.creatureImage) {
      setView('editor');
    } else {
      setView('menu');
    }
    setLoading(false);
  };

  const handleSaveCreature = async (imageData: string) => {
    if (!user) return;
    setLoading(true);
    const response = await fetch(`${SERVER_URL}/api/saveCreature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, image: imageData }),
    });
    if (!response.ok) {
      alert('Failed to save creature');
      setLoading(false);
      return;
    }
    const updatedUser: any = await response.json();
    setUser(updatedUser);
    setLoading(false);
    setView('menu');
  };

  // Fetch bosses ahead of time
  const [bosses, setBosses] = useState<Boss[]>([]);
  useEffect(() => {
    // Fetch bosses only once
    const fetchBosses = async () => {
      const res = await fetch(`${SERVER_URL}/api/bosses`);
      const data = await res.json();
      setBosses(data);
    };
    fetchBosses();
  }, []);

  const handleStartBossBattle = async (boss: Boss) => {
    if (!user) return;
    setLoading(true);
    const response = await fetch(`${SERVER_URL}/api/startBossBattle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, bossId: boss.id }),
    });
    const state = await response.json();
    setBattle(state);
    setView('battle');
    setLoading(false);
  };

  const handleAbility = async (index: number) => {
    if (!battle || !user) return;
    setLoading(true);
    if (battle.type === 'boss') {
      const response = await fetch(`${SERVER_URL}/api/playMove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: battle.id, abilityIndex: index }),
      });
      const result = await response.json();
      setBattle(result);
    } else if (battle.type === 'multiplayer') {
      const response = await fetch(`${SERVER_URL}/api/playMultiplayerMove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: battle.id, name: user.name, abilityIndex: index }),
      });
      const result = await response.json();
      setBattle(result);
    }
    setLoading(false);
  };

  // Poll state for multiplayer matches when appropriate
  useEffect(() => {
    let timer: any;
    if (battle && battle.type === 'multiplayer' && battle.status === 'ongoing') {
      timer = setInterval(async () => {
        const res = await fetch(`${SERVER_URL}/api/getBattleState?id=${battle.id}`);
        if (res.ok) {
          const updatedState = await res.json();
          setBattle(updatedState);
        }
      }, 2000);
    }
    if (battle && battle.type === 'multiplayer' && battle.status === 'lobby') {
      timer = setInterval(async () => {
        const res = await fetch(`${SERVER_URL}/api/getBattleState?id=${battle.id}`);
        if (res.ok) {
          const updatedState = await res.json();
          if (updatedState.status !== 'lobby') {
            setBattle(updatedState);
          }
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [battle]);

  // When multiplayer match is ready, navigate into the battle page
  useEffect(() => {
    if (battle && battle.type === 'multiplayer' && battle.status === 'ongoing') {
      setView('battle');
    }
  }, [battle]);

  const handleCreateMatch = async () => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`${SERVER_URL}/api/createMatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name }),
    });
    const data: any = await res.json();
    setMatchCode(data.code);
    // Retrieve state immediately
    const stateRes = await fetch(`${SERVER_URL}/api/getBattleState?id=${data.code}`);
    const stateJson = await stateRes.json();
    setBattle(stateJson);
    setView('lobby');
    setLoading(false);
  };

  const handleJoinMatch = async (code: string) => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`${SERVER_URL}/api/joinMatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, code }),
    });
    if (!res.ok) {
      alert('Failed to join match');
      setLoading(false);
      return;
    }
    const state: any = await res.json();
    setBattle(state);
    setView('battle');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-300 to-purple-300 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {!user && view === 'enter' && (
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-bold mb-4">PokéCreator Arena</h1>
            <input
              placeholder="Enter your name"
              type="text"
              id="name"
              className="border border-gray-300 rounded px-3 py-2 mb-2 text-lg"
            />
            <button
              className="bg-blue-500 text-white px-6 py-2 rounded text-lg"
              onClick={() => {
                const input: any = document.getElementById('name');
                const val = input?.value;
                if (val) {
                  handleEnter(val);
                }
              }}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </div>
        )}
        {user && view === 'editor' && (
          <div>
            <h2 className="text-2xl mb-4">Design Your Creature</h2>
            <Canvas
              image={user.creatureImage}
              onChange={() => { /* no-op */ }}
            />
            <div className="flex space-x-2 mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  const canvas = (document.querySelector('canvas') as any);
                  const data = canvas.toDataURL('image/png');
                  handleSaveCreature(data);
                }}
              >Save</button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setView('menu')}
              >Cancel</button>
            </div>
          </div>
        )}
        {user && view === 'menu' && (
          <div>
            <div className="flex items-center mb-4">
              {user.creatureImage && (
                <img
                  src={`${SERVER_URL}/api/image/${user.creatureImage}`}
                  alt="Creature"
                  className="w-24 h-24 mr-4 border rounded"
                />
              )}
              <div>
                <h2 className="text-3xl font-bold">{user.name}</h2>
                <p>Health: {user.health}</p>
                <p>Attack: {user.attack}</p>
                <p>Defense: {user.defense}</p>
                <p>Speed: {user.speed}</p>
                <p>Evolution Points: {user.evolutionPoints || 0}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={() => setView('bosses')}>Battle Boss</button>
              <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={() => setView('multiplayer')}>Multiplayer</button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setView('editor')}>Edit Creature</button>
              <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={() => setView('rules')}>View Rules</button>
            </div>
          </div>
        )}
        {user && view === 'bosses' && (
          <div>
            <h2 className="text-2xl mb-4">Choose a Boss</h2>
            <div className="grid grid-cols-2 gap-4">
              {bosses.map((boss) => (
                <div key={boss.id} className="border rounded p-2">
                  <img src={boss.image} alt={boss.name} className="w-full h-48 object-contain" />
                  <h3 className="text-xl font-semibold mt-2">{boss.name}</h3>
                  <p>Health: {boss.health}</p>
                  <div className="mt-2">
                    <button className="bg-red-500 text-white px-4 py-1 rounded" onClick={() => handleStartBossBattle(boss)}>Fight!</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setView('menu')} className="text-blue-500 underline">Back</button>
            </div>
          </div>
        )}
        {user && view === 'battle' && battle && (
          <div>
            <h2 className="text-2xl mb-4">Battle Arena</h2>
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col items-center">
                <img
                  src={
                    battle.players[0].creatureImage
                      ? `${SERVER_URL}/api/image/${battle.players[0].creatureImage}`
                      : ''
                  }
                  alt={battle.players[0].name}
                  className="w-32 h-32 border rounded"
                />
                <div className="w-32 h-4 bg-gray-200 rounded mt-1">
                  <div
                    className="h-full bg-green-500 rounded"
                    style={{ width: `${(battle.players[0].health / (user?.health || 100)) * 100}%` }}
                  ></div>
                </div>
                <div>HP: {battle.players[0].health}</div>
                {battle.type === 'multiplayer' && battle.players[0].name}
              </div>
              <div className="flex flex-col items-center">
                {battle.type === 'boss' ? (
                  <img
                    src={battle.players[1].image}
                    alt={battle.players[1].name}
                    className="w-32 h-32 border rounded"
                  />
                ) : (
                  <img
                    src={
                      battle.players[1].creatureImage
                        ? `${SERVER_URL}/api/image/${battle.players[1].creatureImage}`
                        : ''
                    }
                    alt={battle.players[1].name}
                    className="w-32 h-32 border rounded"
                  />
                )}
                <div className="w-32 h-4 bg-gray-200 rounded mt-1">
                  <div
                    className="h-full bg-red-500 rounded"
                    style={{ width: `${(battle.players[1].health / (battle.type === 'boss' ? (battle.players[1].health + 0) : (battle.players[1].health + 0)) * 100)}%` }}
                  ></div>
                </div>
                <div>HP: {battle.players[1].health}</div>
                {battle.players[1].name}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-xl">Combat Log</h3>
              <div className="bg-gray-100 p-2 h-32 overflow-y-auto border rounded">
                {battle.log.map((entry, i) => (
                  <div key={i}>{entry}</div>
                ))}
              </div>
            </div>
            {battle.status === 'finished' ? (
              <div>
                <h3 className="text-xl font-bold mb-2">
                  {battle.winner === user?.name ? 'You Win!' : 'You Lose!'}
                </h3>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => setView('menu')}
                >Return to Menu</button>
              </div>
            ) : (
              <div>
                {/* Only show abilities when it's the player's turn */}
                {((battle.type === 'boss' && battle.turn === 0) || (battle.type === 'multiplayer' && battle.players[battle.turn].name === user?.name)) && (
                  <div>
                    <h3 className="text-xl mb-2">Abilities</h3>
                    <div className="flex space-x-2">
                      {battle.players[battle.turn].abilities.map((ability: any, index: number) => (
                        <button
                          key={index}
                          className="bg-purple-500 text-white px-4 py-2 rounded"
                          onClick={() => handleAbility(index)}
                        >{ability.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* If it's not your turn */}
                {((battle.type === 'boss' && battle.turn === 1) || (battle.type === 'multiplayer' && battle.players[battle.turn].name !== user?.name)) && (
                  <div className="text-gray-700 mb-2">Waiting for {battle.players[battle.turn].name}...</div>
                )}
                <button
                  className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
                  onClick={() => setView('menu')}
                >Forfeit</button>
              </div>
            )}
          </div>
        )}
        {user && view === 'rules' && (
          <div className="prose">
            <h2>Game Rules</h2>
            <h3>Creature Creation</h3>
            <p>Use the editor to draw your creature. You can change colors, sizes and shapes. Hit Save when you're done.</p>
            <h3>Battles</h3>
            <p>Choose Boss to fight computer-controlled opponents or Multiplayer to challenge a friend. On your turn click one of your creature's abilities. The opponent will attack right after your turn.</p>
            <h3>Winning</h3>
            <p>Reduce your opponent's health to zero to win. Victory and defeat are displayed in the battle screen.</p>
            <h3>Persistence</h3>
            <p>Your creature and progress are saved between sessions simply by entering the same name.</p>
            <div className="mt-4">
              <button onClick={() => setView('menu')} className="text-blue-500 underline">Back to Menu</button>
            </div>
          </div>
        )}
        {user && view === 'multiplayer' && (
          <div>
            <h2 className="text-2xl mb-4">Multiplayer</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <h3 className="text-xl mb-2">Create Match</h3>
                <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleCreateMatch}>Generate Code</button>
                {matchCode && (
                  <div className="mt-2">
                    <p>Your code: <span className="font-bold">{matchCode}</span></p>
                    <p>Share this code with your friend.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border rounded">
                <h3 className="text-xl mb-2">Join Match</h3>
                <input
                  placeholder="Enter code"
                  type="text"
                  id="join-code"
                  className="border border-gray-300 rounded px-3 py-2 mb-2 w-full text-lg"
                />
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    const input: any = document.getElementById('join-code');
                    const codeVal = input.value;
                    handleJoinMatch(codeVal);
                  }}
                >Join</button>
              </div>
            </div>
            <div className="mt-4">
              <button onClick={() => setView('menu')} className="text-blue-500 underline">Back</button>
            </div>
          </div>
        )}
        {user && view === 'lobby' && battle && (
          <div>
            <h2 className="text-2xl mb-4">Match Lobby</h2>
            <p>Share this code with your friend to join:</p>
            <p className="font-bold text-xl">{battle.id}</p>
            <p className="mt-4">Waiting for another player...</p>
            <div className="mt-4">
              <button onClick={() => setView('menu')} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        )}
        {(loading) && <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center text-white text-lg">Loading...</div>}
      </div>
    </div>
  );
}
