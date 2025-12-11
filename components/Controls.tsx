import React from 'react';
import * as Slider from '@radix-ui/react-slider';
import { SnowfallProps } from '../types';
import { Sliders, Wind, ThermometerSnowflake, Palette, Sparkles, Cpu } from 'lucide-react';

interface ControlsProps {
  settings: SnowfallProps;
  onChange: (key: keyof SnowfallProps, value: number | string) => void;
}

const ControlGroup: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="mb-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
    <div className="mb-2 flex items-center gap-2.5 text-sm font-semibold text-blue-200">
      <div className="rounded-lg bg-blue-500/20 p-1.5">{icon}</div>
      <span className="tracking-wide">{title}</span>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step = 1, onChange, unit = '' }) => {
  const displayValue = value.toFixed(step < 0.1 ? 2 : 1);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group relative">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300 transition-colors group-hover:text-white">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-sm font-semibold text-blue-300 tabular-nums">
            {displayValue}
          </span>
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
      </div>
      
      <Slider.Root
        className="relative flex w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0])}
      >
        <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10 transition-all group-hover:bg-white/15">
          <Slider.Range 
            className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 shadow-lg shadow-blue-500/50 transition-all group-hover:shadow-blue-500/70"
            style={{ width: `${percentage}%` }}
          />
        </Slider.Track>
        <Slider.Thumb 
          className="block h-4 w-4 rounded-full bg-white shadow-lg shadow-blue-500/50 ring-2 ring-blue-400/50 transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95"
          aria-label={label}
        />
      </Slider.Root>
      
      {/* Value indicator tooltip on hover */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
        <div className="rounded bg-slate-800 px-2 py-1 text-xs font-mono text-blue-300 shadow-lg ring-1 ring-white/10">
          {displayValue}{unit}
        </div>
      </div>
    </div>
  );
};

const Controls: React.FC<ControlsProps> = ({ settings, onChange }) => {
  return (
    <div className="h-full w-full overflow-y-auto p-4 text-white scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2">
          <Sparkles size={20} className="text-blue-300" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Snow Configuration
        </h2>
      </div>

      <ControlGroup title="Density & Flow" icon={<Sliders size={16} />}>
        <SliderControl
          label="Density"
          value={settings.density || 400}
          min={50}
          max={2000}
          step={50}
          onChange={(v) => onChange('density', v)}
          unit=" flakes"
        />
        <SliderControl
          label="Fall Speed"
          value={settings.speed || 1.2}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange('speed', v)}
          unit="x"
        />
      </ControlGroup>

      <ControlGroup title="Atmosphere" icon={<Wind size={16} />}>
        <SliderControl
          label="Wind Force"
          value={settings.wind ?? 0.2}
          min={-5}
          max={5}
          step={0.1}
          onChange={(v) => onChange('wind', v)}
          unit=" m/s"
        />
      </ControlGroup>

      <ControlGroup title="Particle Physics" icon={<ThermometerSnowflake size={16} />}>
        <SliderControl
          label="Min Size"
          value={settings.minRadius || 0.2}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) => onChange('minRadius', v)}
          unit=" px"
        />
        <SliderControl
          label="Max Size"
          value={settings.maxRadius || 2.3}
          min={1}
          max={10}
          step={0.1}
          onChange={(v) => onChange('maxRadius', v)}
          unit=" px"
        />
        <SliderControl
          label="Irregularity"
          value={settings.roughness || 1.6}
          min={0}
          max={2}
          step={0.1}
          onChange={(v) => onChange('roughness', v)}
        />
      </ControlGroup>

      <ControlGroup title="Appearance" icon={<Palette size={16} />}>
        <SliderControl
          label="Opacity"
          value={settings.opacity ?? 1.0}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange('opacity', v)}
        />
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-300">Snow Color</label>
          <div className="flex gap-2">
            <div className="relative group">
              <input
                type="color"
                value={settings.color || '#ffffff'}
                onChange={(e) => onChange('color', e.target.value)}
                className="h-10 w-10 cursor-pointer overflow-hidden rounded-lg border-2 border-white/30 bg-transparent p-0 transition-all hover:border-blue-400 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={settings.color || '#ffffff'}
                onChange={(e) => onChange('color', e.target.value)}
                className="h-10 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-mono text-white placeholder-white/30 transition-all hover:bg-white/15 focus:border-blue-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </ControlGroup>

      <ControlGroup title="Renderer" icon={<Cpu size={16} />}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-300">Rendering Engine</label>
          <div className="flex gap-2">
            {(['auto', 'webgl', 'canvas'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onChange('renderer', mode)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  settings.renderer === mode
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {settings.renderer === 'auto' && 'Automatically selects the best renderer'}
            {settings.renderer === 'webgl' && 'GPU-accelerated rendering (faster)'}
            {settings.renderer === 'canvas' && 'CPU-based Canvas 2D rendering'}
          </p>
        </div>
      </ControlGroup>
    </div>
  );
};

export default Controls;
