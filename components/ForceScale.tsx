import React from 'react';
import { ForceLevel, FORCE_LEVEL_DETAILS } from '../types';
import { Shield, MessageSquare, Hand, AlertTriangle, Skull } from 'lucide-react';

interface ForceScaleProps {
  selectedLevel: ForceLevel;
  onSelect: (level: ForceLevel) => void;
}

export const ForceScale: React.FC<ForceScaleProps> = ({ selectedLevel, onSelect }) => {
  const levels = [
    { level: ForceLevel.LEVEL_5, icon: Skull },
    { level: ForceLevel.LEVEL_4, icon: AlertTriangle },
    { level: ForceLevel.LEVEL_3, icon: Hand },
    { level: ForceLevel.LEVEL_2, icon: MessageSquare },
    { level: ForceLevel.LEVEL_1, icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-3 w-full my-6">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-bold text-center">
        Indicador de Força (Selecione o Máximo Atingido)
      </h3>
      
      {levels.map((item) => {
        const isSelected = selectedLevel === item.level;
        const details = FORCE_LEVEL_DETAILS[item.level];
        const Icon = item.icon;

        // Dynamic classes based on selection state
        const containerClass = isSelected
          ? `bg-[#1C1C1E] border-2 ${details.borderColor} translate-x-2`
          : `bg-[#0A0A0A] border border-gray-800 opacity-60 hover:opacity-80`;

        const iconClass = isSelected ? details.color : "text-gray-600";
        const textClass = isSelected ? "text-white" : "text-gray-500";

        return (
          <button
            key={item.level}
            onClick={() => {
              // Simple haptic simulation using navigator.vibrate if available
              if (navigator.vibrate) navigator.vibrate(50);
              onSelect(item.level);
            }}
            className={`
              relative p-4 rounded-md transition-all duration-300 ease-out flex items-center gap-4 text-left w-full group
              ${containerClass}
            `}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <div className={`absolute inset-0 blur-md opacity-20 rounded-md ${details.color.replace('text-', 'bg-')}`}></div>
            )}

            <div className={`z-10 p-2 rounded-full bg-black/50 ${iconClass}`}>
              <Icon size={20} strokeWidth={2.5} />
            </div>

            <div className="z-10 flex flex-col">
              <span className={`font-['Montserrat'] font-bold uppercase text-sm ${textClass}`}>
                Nível {item.level}: {details.label}
              </span>
              <span className="text-xs text-gray-500 font-['Inter']">
                {details.description}
              </span>
            </div>
            
            {isSelected && (
              <div className="ml-auto z-10">
                <div className={`h-2 w-2 rounded-full animate-pulse ${details.color.replace('text-', 'bg-')}`}></div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};