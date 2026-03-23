/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Play, Activity, Settings2, Ear, Music, RefreshCw, Volume2 } from 'lucide-react';
import { audioEngine, InstrumentType } from './lib/audio';
import { getScaleRatios, getIntervalName, ratioToCents, Temperament } from './lib/scales';
import { WaveformVisualizer } from './components/WaveformVisualizer';

export default function App() {
  const [numNotes, setNumNotes] = useState(12);
  const [temperament, setTemperament] = useState<Temperament>('equal');
  const [baseFreq, setBaseFreq] = useState(440);
  const [mode, setMode] = useState<'explore' | 'practice'>('explore');
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isInstrumentLoaded, setIsInstrumentLoaded] = useState(false);

  // Practice mode state
  const [targetInterval, setTargetInterval] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [lastGuess, setLastGuess] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    // Initialize analyser reference for visualizer when audio engine is ready
    const checkAnalyser = setInterval(() => {
      if (audioEngine.analyser && !analyser) {
        setAnalyser(audioEngine.analyser);
        clearInterval(checkAnalyser);
      }
    }, 500);
    return () => clearInterval(checkAnalyser);
  }, [analyser]);

  useEffect(() => {
    setIsInstrumentLoaded(false);
    audioEngine.loadInstrument(instrument).then(() => {
      setIsInstrumentLoaded(true);
    }).catch(e => {
      console.error("Failed to load instrument:", e);
      setIsInstrumentLoaded(true); // Allow UI to recover
    });
  }, [instrument]);

  const ratios = useMemo(() => getScaleRatios(numNotes, temperament), [numNotes, temperament]);

  const playInterval = (steps: number, melodic: boolean = false) => {
    const freq1 = baseFreq;
    const freq2 = baseFreq * ratios[steps];
    if (melodic) {
      audioEngine.playMelodic(freq1, freq2, instrument);
    } else {
      audioEngine.playHarmonic(freq1, freq2, instrument);
    }
  };

  const startPractice = () => {
    const randomInterval = Math.floor(Math.random() * numNotes) + 1; // 1 to numNotes
    setTargetInterval(randomInterval);
    setLastGuess(null);
    
    // Play it
    const freq1 = baseFreq;
    const freq2 = baseFreq * ratios[randomInterval];
    audioEngine.playHarmonic(freq1, freq2, instrument);
  };

  const guessInterval = (steps: number) => {
    if (targetInterval === null) return;
    
    if (steps === targetInterval) {
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
      setLastGuess('correct');
      setTimeout(() => {
        startPractice();
      }, 1500);
    } else {
      setScore(s => ({ ...s, total: s.total + 1 }));
      setLastGuess('incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#15181e] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Interval Explorer</h1>
            <p className="text-xs text-gray-400 font-mono">Ear Training & Synthesis</p>
          </div>
        </div>
        
        <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-800">
          <button 
            onClick={() => setMode('explore')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'explore' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Music className="w-4 h-4" /> Explore
          </button>
          <button 
            onClick={() => setMode('practice')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${mode === 'practice' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Ear className="w-4 h-4" /> Practice
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#15181e] border border-gray-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              Parameters
            </div>
            
            <div className="space-y-3">
              <label className="block">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Base Frequency (Hz)</div>
                <input 
                  type="number" 
                  value={baseFreq} 
                  onChange={e => setBaseFreq(Number(e.target.value) || 440)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </label>

              <label className="block">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Notes in Scale</div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="6" max="15" 
                    value={numNotes} 
                    onChange={e => {
                      setNumNotes(Number(e.target.value));
                      setTargetInterval(null);
                    }}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-sm font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800 w-10 text-center">{numNotes}</span>
                </div>
              </label>

              <label className="block">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Temperament</div>
                <select 
                  value={temperament} 
                  onChange={e => setTemperament(e.target.value as Temperament)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="equal">Equal Temperament</option>
                  <option value="pythagorean">Pythagorean Tuning</option>
                  <option value="just">Just Intonation (5-limit approx)</option>
                </select>
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Instrument</div>
                  {!isInstrumentLoaded && (
                    <div className="text-[10px] text-indigo-400 animate-pulse">Loading sample...</div>
                  )}
                </div>
                <select 
                  value={instrument} 
                  onChange={e => setInstrument(e.target.value as InstrumentType)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="piano">Piano</option>
                  <option value="guitar">Guitar</option>
                  <option value="organ">Organ</option>
                </select>
              </label>
            </div>
          </div>

          {/* Visualizer */}
          <div className="bg-[#15181e] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
              <Activity className="w-4 h-4 text-emerald-400" />
              Oscilloscope
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#0a0c10]">
              <WaveformVisualizer analyser={analyser} />
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9">
          {mode === 'explore' ? (
            <div className="bg-[#15181e] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Interval Explorer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ratios.map((ratio, i) => (
                  <div key={i} className="group bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/50 hover:bg-gray-800/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-200">{getIntervalName(i, numNotes)}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">Step {i}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-indigo-300">{ratio.toFixed(4)}x</div>
                        <div className="text-xs font-mono text-gray-500">{ratioToCents(ratio).toFixed(1)}¢</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => playInterval(i, false)}
                        className="flex-1 bg-gray-800 hover:bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Harmonic
                      </button>
                      <button 
                        onClick={() => playInterval(i, true)}
                        className="flex-1 bg-gray-800 hover:bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Melodic
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#15181e] border border-gray-800 rounded-2xl p-6 min-h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold text-white">Ear Training</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 font-mono">
                    Score: <span className="text-emerald-400">{score.correct}</span> / {score.total}
                  </div>
                  <button 
                    onClick={() => setScore({ correct: 0, total: 0 })}
                    className="text-gray-500 hover:text-gray-300"
                    title="Reset Score"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                
                <div className="mb-12 text-center">
                  <button 
                    onClick={startPractice}
                    className="w-32 h-32 rounded-full bg-indigo-500 hover:bg-indigo-400 flex flex-col items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] transition-all transform hover:scale-105"
                  >
                    <Play className="w-10 h-10 ml-1 mb-2" />
                    <span className="font-medium">Play New</span>
                  </button>
                  {targetInterval !== null && (
                    <button 
                      onClick={() => playInterval(targetInterval, false)}
                      className="mt-6 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mx-auto"
                    >
                      <Volume2 className="w-4 h-4" /> Replay Interval
                    </button>
                  )}
                </div>

                {lastGuess && (
                  <div className={`mb-8 px-6 py-2 rounded-full text-sm font-medium ${lastGuess === 'correct' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {lastGuess === 'correct' ? 'Correct! Loading next...' : 'Incorrect, try again.'}
                  </div>
                )}

                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ratios.map((_, i) => {
                    if (i === 0) return null; // Skip unison
                    return (
                      <button
                        key={i}
                        disabled={targetInterval === null || lastGuess === 'correct'}
                        onClick={() => guessInterval(i)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all
                          ${targetInterval === null 
                            ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed' 
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white'
                          }
                        `}
                      >
                        {getIntervalName(i, numNotes)}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
