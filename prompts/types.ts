
export type StudioMode = 'Scene' | 'Editing' | 'Product' | 'Banner';

export type PromptType = 'Image' | 'Video' | 'VideoWithSound';

export interface Subject {
    id: string;
    name: string;
    [key: string]: any; 
}

export interface TimelineEvent {
    id: string;
    paramName: string; // The human-readable name, e.g., "Action"
    paramPath: string; // The machine-readable path, e.g., "scene.action"
    paramLabel: string;
    subjectId?: string; // Optional: links event to a specific subject
    start: number;
    end: number;
    value: string;
}

export interface SceneState {
    promptType: PromptType;
    subjects: Subject[];
    params: {
        [key: string]: any;
    };
    timeline: TimelineEvent[];
}

export interface UpdateOutputsFn {
  (text: string, json: object): void;
}
