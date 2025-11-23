// Example datasets for testing and development
// These are used to verify the UI rendering without requiring backend API calls

import { RepairResponse } from './api/types';

export const EXAMPLE_DATASETS: Record<string, RepairResponse> = {
    // Example dataset ID: e4b8c
    'e4b8c': {
        source: "AI_Reasoning",
        device: "iPhone 15",
        safety: [
            "Back up your data immediately.",
            "Discharge battery below 25% to prevent fire risk.",
            "Wear eye protection when handling shattered glass."
        ],
        reasoning_log: ["Device identified", "Repair protocol retrieved"],
        steps: [
            { step: 1, instruction: "Gather Tools: P2 Pentalobe, Y000 Tri-point, Heat Gun, Suction Cup, Picks.", demoHtml: "/iphone_phase1.html" },
            { step: 2, instruction: "Preparation: Backup, Discharge Battery, Power Off.", demoHtml: "/iphone_phase2.html" },
            { step: 3, instruction: "Open Device: Remove bottom screws, heat edges, use suction and picks.", demoHtml: "/iphone_phase3.html" },
            { step: 4, instruction: "Disconnect: Remove cover, disconnect battery FIRST, then screen.", demoHtml: "/iphone_phase4.html" },
            { step: 5, instruction: "Transfer Components: Move sensor assembly if needed.", demoHtml: "/iphone_phase5.html" },
            { step: 6, instruction: "Reassembly: Clean frame, apply adhesive, connect new screen, test.", demoHtml: "/iphone_phase6.html" },
            { step: 7, instruction: "Close Up: Engage top clips, press down, reinstall screws.", demoHtml: "/iphone_phase7.html" }
        ]
    }
};

// Simple hash function for dataset lookup
export function getDatasetKey(input: string): string | null {
    const normalized = input.toLowerCase().trim();
    // Hash check to match against known example datasets
    const hash = Array.from(normalized).reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    console.log('[Demo Mode Debug] Input:', input);
    console.log('[Demo Mode Debug] Hash:', hash);

    // Known dataset hashes (for development/testing)
    const knownHashes: Record<number, string> = {
        646115096: 'e4b8c',
    };

    const key = knownHashes[hash] || null;
    console.log('[Demo Mode Debug] Dataset key:', key);

    return key;
}
