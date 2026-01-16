import React from 'react';
import { COLORS } from '../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const TacticalButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  const baseStyle = "font-['Montserrat'] font-bold py-4 px-6 rounded-lg transition-all duration-200 active:scale-95 uppercase tracking-wider text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg";
  
  let variantStyle = "";
  switch (variant) {
    case 'primary':
      variantStyle = `bg-[#C5A059] text-black hover:bg-[#d6b26b] shadow-[#C5A059]/20`;
      break;
    case 'secondary':
      variantStyle = `bg-[#1C1C1E] text-[#C5A059] border border-[#C5A059]/30 hover:border-[#C5A059]`;
      break;
    case 'danger':
      variantStyle = `bg-[#D32F2F] text-white hover:bg-red-700 shadow-red-900/50 animate-pulse`;
      break;
    case 'ghost':
        variantStyle = `bg-transparent text-[#9CA3AF] hover:text-white`;
        break;
  }

  return (
    <button 
      className={`${baseStyle} ${variantStyle} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const TacticalCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-[#1C1C1E] border border-gray-800 rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

export const Header: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h1 className="text-2xl sm:text-3xl font-['Montserrat'] font-extrabold text-[#C5A059] uppercase tracking-widest">
      {title}
    </h1>
    {subtitle && (
      <p className="text-gray-400 text-sm mt-1 font-['Inter']">
        {subtitle}
      </p>
    )}
    <div className="h-1 w-12 bg-[#C5A059] mt-2"></div>
  </div>
);

export const Disclaimer: React.FC = () => (
  <div className="mt-8 p-3 border-l-2 border-[#FFB300] bg-[#FFB300]/5 rounded-r text-xs text-gray-400">
    <strong className="text-[#FFB300] block mb-1">AVISO LEGAL</strong>
    Esta aplicação é uma ferramenta de suporte. A responsabilidade pela veracidade dos fatos é exclusivamente do relator. Não substitui consultoria jurídica.
  </div>
);