import React from 'react';
import { Star } from 'lucide-react';
import { ScoringCriteria, Language } from '../types';

interface ScoringPanelProps {
  scoring: ScoringCriteria;
  onChange: (newScoring: ScoringCriteria) => void;
  language: Language;
}

export const ScoringPanel: React.FC<ScoringPanelProps> = ({ scoring, onChange, language }) => {
  const handleChange = (field: keyof ScoringCriteria, value: number | string) => {
    onChange({
      ...scoring,
      [field]: value
    });
  };

  const renderSlider = (label: string, field: keyof ScoringCriteria) => {
    const value = scoring[field] as number;
    // Logic: 4-5 Good, 3 Average, 1-2 Poor
    const colorClass = value >= 4 
        ? 'bg-green-100 text-green-700' 
        : value >= 3 
            ? 'bg-yellow-100 text-yellow-700' 
            : 'bg-red-100 text-red-700';

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold uppercase text-slate-500">{label}</label>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${colorClass}`}>
            {value}/5
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(e) => handleChange(field, parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    );
  };

  const average = ((scoring.pertinence + scoring.quality + scoring.clarity + scoring.reliability) / 4).toFixed(1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        <h3 className="font-bold text-slate-800">
          {language === 'spanish' ? 'Evaluación del Paper' : 'Paper Scoring'}
        </h3>
        <div className="ml-auto text-lg font-black text-indigo-600">
          {average}<span className="text-xs text-slate-400 font-normal">/5</span>
        </div>
      </div>

      {renderSlider(language === 'spanish' ? 'Pertinencia' : 'Pertinence', 'pertinence')}
      {renderSlider(language === 'spanish' ? 'Calidad Info' : 'Info Quality', 'quality')}
      {renderSlider(language === 'spanish' ? 'Claridad' : 'Clarity', 'clarity')}
      {renderSlider(language === 'spanish' ? 'Confiabilidad' : 'Reliability', 'reliability')}

      <div className="mt-4">
        <label className="text-xs font-bold uppercase text-slate-500 block mb-1">
          {language === 'spanish' ? 'Notas' : 'Notes'}
        </label>
        <textarea
          value={scoring.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-20"
          placeholder={language === 'spanish' ? 'Agrega notas personales...' : 'Add personal notes...'}
        />
      </div>
    </div>
  );
};