import React from 'react';
import { 
  BookOpen, 
  Beaker, 
  Code, 
  Users, 
  Settings, 
  Lightbulb, 
  Target, 
  Zap, 
  AlertCircle, 
  FileText,
  CheckCircle2,
  Folder,
  FolderOpen,
  Star,
  MoreVertical,
  LucideProps
} from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  className?: string;
}

export const DynamicIcon: React.FC<IconProps> = ({ name, ...props }) => {
  const normalizedName = name.toLowerCase().trim();

  switch (normalizedName) {
    case 'book':
    case 'book-open':
      return <BookOpen {...props} />;
    case 'beaker':
    case 'lab':
      return <Beaker {...props} />;
    case 'code':
      return <Code {...props} />;
    case 'users':
    case 'people':
      return <Users {...props} />;
    case 'settings':
    case 'gear':
      return <Settings {...props} />;
    case 'bulb':
    case 'lightbulb':
    case 'idea':
      return <Lightbulb {...props} />;
    case 'target':
    case 'goal':
      return <Target {...props} />;
    case 'zap':
    case 'energy':
      return <Zap {...props} />;
    case 'alert':
    case 'warning':
      return <AlertCircle {...props} />;
    case 'check':
      return <CheckCircle2 {...props} />;
    case 'folder':
      return <Folder {...props} />;
    case 'folder-open':
      return <FolderOpen {...props} />;
    case 'star':
      return <Star {...props} />;
    case 'more':
      return <MoreVertical {...props} />;
    default:
      return <FileText {...props} />;
  }
};