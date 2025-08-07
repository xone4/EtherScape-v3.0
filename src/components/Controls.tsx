import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Slider } from './ui/slider';

interface ControlsProps {
  onGenerate: (
    theme: string,
    seed: number,
    guidance: number,
    style: string
  ) => void;
  isGenerating: boolean;
  onOpenDrive: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  onGenerate,
  isGenerating,
  onOpenDrive,
}) => {
  const [themeInput, setThemeInput] = useState('a cat in a hat');
  const [seedInput, setSeedInput] = useState(12345);
  const [guidanceInput, setGuidanceInput] = useState(7);
  const [styleInput, setStyleInput] = useState('default');

  const handleRandomize = () => {
    setSeedInput(Math.floor(Math.random() * 100000));
  };

  const handleGenerate = () => {
    onGenerate(themeInput, seedInput, guidanceInput, styleInput);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="theme">Theme</Label>
        <Input
          id="theme"
          value={themeInput}
          onChange={(e) => setThemeInput(e.target.value)}
          placeholder="e.g. a cat in a hat"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="seed">Seed</Label>
        <Input
          id="seed"
          type="number"
          value={seedInput}
          onChange={(e) => setSeedInput(Number(e.target.value))}
          className="w-24"
        />
        <Button onClick={handleRandomize} variant="secondary">
          Randomize
        </Button>
      </div>
      <div>
        <Label htmlFor="guidance">Guidance</Label>
        <Slider
          id="guidance"
          min={0}
          max={20}
          step={1}
          value={[guidanceInput]}
          onValueChange={(value) => setGuidanceInput(value[0])}
        />
      </div>
      <div>
        <Label htmlFor="style">Style</Label>
        <Select value={styleInput} onValueChange={setStyleInput}>
          <SelectTrigger>
            <SelectValue placeholder="Select a style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="realistic">Realistic</SelectItem>
            <SelectItem value="digital-art">Digital Art</SelectItem>
            <SelectItem value="3d-model">3D Model</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate'}
      </Button>
      <Button onClick={onOpenDrive} variant="outline">
        Open Google Drive
      </Button>
    </div>
  );
};

export default Controls;
