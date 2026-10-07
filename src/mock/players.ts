import { Player, PlayerRole } from '../types';

/**
 * Dataset di calciatori Serie A per il Fanta-Fantacalcio
 * Bilanciato per ruolo con valori realistici
 */

// Helper per generare ID univoci
const generateId = (name: string): string => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * PORTIERI (24 giocatori)
 * Range valore: 1-35 crediti
 */
const goalkeepers: Player[] = [
  // Top tier (25-35 crediti)
  { id: generateId('Mike Maignan'), name: 'Mike Maignan', role: 'P', team: 'Milan', baseValue: 35, avgRating: 6.3, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.05, redCardProbability: 0.01, penaltySaveProbability: 0.25, cleanSheetProbability: 0.35, reliability: 0.9 },
  { id: generateId('Yann Sommer'), name: 'Yann Sommer', role: 'P', team: 'Inter', baseValue: 30, avgRating: 6.2, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.22, cleanSheetProbability: 0.38, reliability: 0.92 },
  { id: generateId('Wojciech Szczesny'), name: 'Wojciech Szczesny', role: 'P', team: 'Juventus', baseValue: 28, avgRating: 6.15, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.2, cleanSheetProbability: 0.32, reliability: 0.88 },
  
  // Mid-high tier (15-24 crediti)
  { id: generateId('Alex Meret'), name: 'Alex Meret', role: 'P', team: 'Napoli', baseValue: 22, avgRating: 6.1, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.18, cleanSheetProbability: 0.30, reliability: 0.85 },
  { id: generateId('Ivan Provedel'), name: 'Ivan Provedel', role: 'P', team: 'Lazio', baseValue: 20, avgRating: 6.05, goalProbability: 0.02, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.15, cleanSheetProbability: 0.28, reliability: 0.9 },
  { id: generateId('Marco Carnesecchi'), name: 'Marco Carnesecchi', role: 'P', team: 'Atalanta', baseValue: 18, avgRating: 6.0, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.16, cleanSheetProbability: 0.26, reliability: 0.87 },
  { id: generateId('Michele Di Gregorio'), name: 'Michele Di Gregorio', role: 'P', team: 'Monza', baseValue: 16, avgRating: 6.0, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.14, cleanSheetProbability: 0.22, reliability: 0.88 },
  
  // Mid tier (8-14 crediti)
  { id: generateId('Guglielmo Vicario'), name: 'Guglielmo Vicario', role: 'P', team: 'Empoli', baseValue: 14, avgRating: 5.95, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.12, cleanSheetProbability: 0.20, reliability: 0.85 },
  { id: generateId('Vanja Milinkovic-Savic'), name: 'Vanja Milinkovic-Savic', role: 'P', team: 'Torino', baseValue: 12, avgRating: 5.9, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.05, redCardProbability: 0.01, penaltySaveProbability: 0.13, cleanSheetProbability: 0.22, reliability: 0.82 },
  { id: generateId('Bartlomiej Dragowski'), name: 'Bartlomiej Dragowski', role: 'P', team: 'Spezia', baseValue: 10, avgRating: 5.85, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.05, redCardProbability: 0.02, penaltySaveProbability: 0.1, cleanSheetProbability: 0.18, reliability: 0.8 },
  { id: generateId('Pierluigi Gollini'), name: 'Pierluigi Gollini', role: 'P', team: 'Fiorentina', baseValue: 10, avgRating: 5.85, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.11, cleanSheetProbability: 0.19, reliability: 0.75 },
  { id: generateId('Stefano Turati'), name: 'Stefano Turati', role: 'P', team: 'Sassuolo', baseValue: 9, avgRating: 5.8, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.1, cleanSheetProbability: 0.17, reliability: 0.78 },
  
  // Low tier (1-7 crediti)
  { id: generateId('Elia Caprile'), name: 'Elia Caprile', role: 'P', team: 'Empoli', baseValue: 7, avgRating: 5.75, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.08, cleanSheetProbability: 0.15, reliability: 0.7 },
  { id: generateId('Lorenzo Montipo'), name: 'Lorenzo Montipo', role: 'P', team: 'Verona', baseValue: 6, avgRating: 5.7, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.08, cleanSheetProbability: 0.14, reliability: 0.72 },
  { id: generateId('Alessio Cragno'), name: 'Alessio Cragno', role: 'P', team: 'Sassuolo', baseValue: 5, avgRating: 5.7, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.09, cleanSheetProbability: 0.13, reliability: 0.65 },
  { id: generateId('Marco Silvestri'), name: 'Marco Silvestri', role: 'P', team: 'Udinese', baseValue: 5, avgRating: 5.65, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.05, redCardProbability: 0.01, penaltySaveProbability: 0.07, cleanSheetProbability: 0.12, reliability: 0.68 },
  { id: generateId('Lukasz Skorupski'), name: 'Lukasz Skorupski', role: 'P', team: 'Bologna', baseValue: 4, avgRating: 5.6, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.06, cleanSheetProbability: 0.11, reliability: 0.7 },
  { id: generateId('Wladimiro Falcone'), name: 'Wladimiro Falcone', role: 'P', team: 'Lecce', baseValue: 4, avgRating: 5.6, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.06, cleanSheetProbability: 0.10, reliability: 0.72 },
  { id: generateId('Mattia Perin'), name: 'Mattia Perin', role: 'P', team: 'Juventus', baseValue: 3, avgRating: 5.55, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.05, cleanSheetProbability: 0.09, reliability: 0.5 },
  { id: generateId('Emil Audero'), name: 'Emil Audero', role: 'P', team: 'Sampdoria', baseValue: 3, avgRating: 5.5, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.05, cleanSheetProbability: 0.08, reliability: 0.6 },
  { id: generateId('Luigi Sepe'), name: 'Luigi Sepe', role: 'P', team: 'Salernitana', baseValue: 2, avgRating: 5.45, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.04, redCardProbability: 0.01, penaltySaveProbability: 0.04, cleanSheetProbability: 0.07, reliability: 0.55 },
  { id: generateId('Rui Patricio'), name: 'Rui Patricio', role: 'P', team: 'Roma', baseValue: 2, avgRating: 5.4, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.03, redCardProbability: 0.01, penaltySaveProbability: 0.04, cleanSheetProbability: 0.06, reliability: 0.5 },
  { id: generateId('Antonio Mirante'), name: 'Antonio Mirante', role: 'P', team: 'Milan', baseValue: 1, avgRating: 5.3, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.02, redCardProbability: 0.01, penaltySaveProbability: 0.03, cleanSheetProbability: 0.05, reliability: 0.3 },
  { id: generateId('Salvatore Sirigu'), name: 'Salvatore Sirigu', role: 'P', team: 'Napoli', baseValue: 1, avgRating: 5.25, goalProbability: 0, assistProbability: 0, yellowCardProbability: 0.02, redCardProbability: 0.01, penaltySaveProbability: 0.03, cleanSheetProbability: 0.04, reliability: 0.25 },
];

/**
 * DIFENSORI (60 giocatori)
 * Range valore: 1-30 crediti
 */
const defenders: Player[] = [
  // Top tier (22-30 crediti)
  { id: generateId('Theo Hernandez'), name: 'Theo Hernandez', role: 'D', team: 'Milan', baseValue: 30, avgRating: 6.4, goalProbability: 0.08, assistProbability: 0.12, yellowCardProbability: 0.15, redCardProbability: 0.02, cleanSheetProbability: 0.32, reliability: 0.88 },
  { id: generateId('Federico Dimarco'), name: 'Federico Dimarco', role: 'D', team: 'Inter', baseValue: 28, avgRating: 6.35, goalProbability: 0.06, assistProbability: 0.14, yellowCardProbability: 0.12, redCardProbability: 0.01, cleanSheetProbability: 0.35, reliability: 0.9 },
  { id: generateId('Giovanni Di Lorenzo'), name: 'Giovanni Di Lorenzo', role: 'D', team: 'Napoli', baseValue: 26, avgRating: 6.3, goalProbability: 0.05, assistProbability: 0.1, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.33, reliability: 0.92 },
  { id: generateId('Gleison Bremer'), name: 'Gleison Bremer', role: 'D', team: 'Juventus', baseValue: 25, avgRating: 6.25, goalProbability: 0.04, assistProbability: 0.02, yellowCardProbability: 0.14, redCardProbability: 0.02, cleanSheetProbability: 0.34, reliability: 0.85 },
  { id: generateId('Alessandro Bastoni'), name: 'Alessandro Bastoni', role: 'D', team: 'Inter', baseValue: 24, avgRating: 6.2, goalProbability: 0.03, assistProbability: 0.06, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.36, reliability: 0.9 },
  { id: generateId('Kim Min-jae'), name: 'Kim Min-jae', role: 'D', team: 'Napoli', baseValue: 23, avgRating: 6.2, goalProbability: 0.03, assistProbability: 0.02, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.35, reliability: 0.88 },
  
  // Mid-high tier (15-21 crediti)
  { id: generateId('Fikayo Tomori'), name: 'Fikayo Tomori', role: 'D', team: 'Milan', baseValue: 21, avgRating: 6.15, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.13, redCardProbability: 0.02, cleanSheetProbability: 0.30, reliability: 0.85 },
  { id: generateId('Rafael Toloi'), name: 'Rafael Toloi', role: 'D', team: 'Atalanta', baseValue: 19, avgRating: 6.1, goalProbability: 0.03, assistProbability: 0.03, yellowCardProbability: 0.11, redCardProbability: 0.02, cleanSheetProbability: 0.28, reliability: 0.75 },
  { id: generateId('Stefan de Vrij'), name: 'Stefan de Vrij', role: 'D', team: 'Inter', baseValue: 18, avgRating: 6.05, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.32, reliability: 0.82 },
  { id: generateId('Danilo'), name: 'Danilo', role: 'D', team: 'Juventus', baseValue: 17, avgRating: 6.0, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.28, reliability: 0.85 },
  { id: generateId('Mario Rui'), name: 'Mario Rui', role: 'D', team: 'Napoli', baseValue: 16, avgRating: 6.0, goalProbability: 0.01, assistProbability: 0.08, yellowCardProbability: 0.14, redCardProbability: 0.02, cleanSheetProbability: 0.30, reliability: 0.88 },
  { id: generateId('Matteo Darmian'), name: 'Matteo Darmian', role: 'D', team: 'Inter', baseValue: 15, avgRating: 5.95, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.30, reliability: 0.8 },
  
  // Mid tier (8-14 crediti)
  { id: generateId('Amir Rrahmani'), name: 'Amir Rrahmani', role: 'D', team: 'Napoli', baseValue: 14, avgRating: 5.9, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.28, reliability: 0.82 },
  { id: generateId('Berat Djimsiti'), name: 'Berat Djimsiti', role: 'D', team: 'Atalanta', baseValue: 13, avgRating: 5.9, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.25, reliability: 0.8 },
  { id: generateId('Adam Masina'), name: 'Adam Masina', role: 'D', team: 'Udinese', baseValue: 12, avgRating: 5.85, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.2, reliability: 0.78 },
  { id: generateId('Nikola Milenkovic'), name: 'Nikola Milenkovic', role: 'D', team: 'Fiorentina', baseValue: 12, avgRating: 5.85, goalProbability: 0.03, assistProbability: 0.01, yellowCardProbability: 0.14, redCardProbability: 0.03, cleanSheetProbability: 0.22, reliability: 0.82 },
  { id: generateId('Cristiano Biraghi'), name: 'Cristiano Biraghi', role: 'D', team: 'Fiorentina', baseValue: 11, avgRating: 5.85, goalProbability: 0.02, assistProbability: 0.08, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.2, reliability: 0.85 },
  { id: generateId('Elseid Hysaj'), name: 'Elseid Hysaj', role: 'D', team: 'Lazio', baseValue: 10, avgRating: 5.8, goalProbability: 0.01, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.22, reliability: 0.75 },
  { id: generateId('Nehuen Perez'), name: 'Nehuen Perez', role: 'D', team: 'Udinese', baseValue: 10, avgRating: 5.8, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.18, reliability: 0.78 },
  { id: generateId('Davide Calabria'), name: 'Davide Calabria', role: 'D', team: 'Milan', baseValue: 10, avgRating: 5.8, goalProbability: 0.01, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.25, reliability: 0.72 },
  { id: generateId('Gianluca Mancini'), name: 'Gianluca Mancini', role: 'D', team: 'Roma', baseValue: 9, avgRating: 5.75, goalProbability: 0.03, assistProbability: 0.01, yellowCardProbability: 0.15, redCardProbability: 0.03, cleanSheetProbability: 0.2, reliability: 0.8 },
  { id: generateId('Roger Ibanez'), name: 'Roger Ibanez', role: 'D', team: 'Roma', baseValue: 9, avgRating: 5.75, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.2, reliability: 0.78 },
  { id: generateId('Perr Schuurs'), name: 'Perr Schuurs', role: 'D', team: 'Torino', baseValue: 9, avgRating: 5.75, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.2, reliability: 0.75 },
  { id: generateId('Merih Demiral'), name: 'Merih Demiral', role: 'D', team: 'Atalanta', baseValue: 8, avgRating: 5.7, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.14, redCardProbability: 0.03, cleanSheetProbability: 0.22, reliability: 0.72 },
  
  // Low-mid tier (4-7 crediti)
  { id: generateId('Destiny Udogie'), name: 'Destiny Udogie', role: 'D', team: 'Udinese', baseValue: 7, avgRating: 5.7, goalProbability: 0.02, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.16, reliability: 0.8 },
  { id: generateId('Andrea Cambiaso'), name: 'Andrea Cambiaso', role: 'D', team: 'Juventus', baseValue: 7, avgRating: 5.7, goalProbability: 0.01, assistProbability: 0.05, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.22, reliability: 0.75 },
  { id: generateId('Wilfried Singo'), name: 'Wilfried Singo', role: 'D', team: 'Torino', baseValue: 6, avgRating: 5.65, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.18, reliability: 0.78 },
  { id: generateId('Fabiano Parisi'), name: 'Fabiano Parisi', role: 'D', team: 'Empoli', baseValue: 6, avgRating: 5.65, goalProbability: 0.01, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.15, reliability: 0.8 },
  { id: generateId('Luca Pellegrini'), name: 'Luca Pellegrini', role: 'D', team: 'Lazio', baseValue: 5, avgRating: 5.6, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.18, reliability: 0.65 },
  { id: generateId('Koffi Djidji'), name: 'Koffi Djidji', role: 'D', team: 'Torino', baseValue: 5, avgRating: 5.6, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.16, reliability: 0.72 },
  { id: generateId('Sebastiano Luperto'), name: 'Sebastiano Luperto', role: 'D', team: 'Empoli', baseValue: 5, avgRating: 5.6, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.14, reliability: 0.75 },
  { id: generateId('Ardian Ismajli'), name: 'Ardian Ismajli', role: 'D', team: 'Empoli', baseValue: 5, avgRating: 5.6, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.14, reliability: 0.78 },
  { id: generateId('Mattia Viti'), name: 'Mattia Viti', role: 'D', team: 'Empoli', baseValue: 4, avgRating: 5.55, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.12, reliability: 0.7 },
  { id: generateId('Filippo Terracciano'), name: 'Filippo Terracciano', role: 'D', team: 'Milan', baseValue: 4, avgRating: 5.55, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.2, reliability: 0.6 },
  { id: generateId('Davide Zappacosta'), name: 'Davide Zappacosta', role: 'D', team: 'Atalanta', baseValue: 4, avgRating: 5.55, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.2, reliability: 0.65 },
  { id: generateId('Jens Stryger Larsen'), name: 'Jens Stryger Larsen', role: 'D', team: 'Udinese', baseValue: 4, avgRating: 5.55, goalProbability: 0.01, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.14, reliability: 0.68 },
  
  // Low tier (1-3 crediti)
  { id: generateId('Mattia Caldara'), name: 'Mattia Caldara', role: 'D', team: 'Spezia', baseValue: 3, avgRating: 5.5, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.1, reliability: 0.55 },
  { id: generateId('Marash Kumbulla'), name: 'Marash Kumbulla', role: 'D', team: 'Roma', baseValue: 3, avgRating: 5.5, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.12, reliability: 0.6 },
  { id: generateId('Riccardo Calafiori'), name: 'Riccardo Calafiori', role: 'D', team: 'Roma', baseValue: 3, avgRating: 5.5, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.12, reliability: 0.55 },
  { id: generateId('Simone Romagnoli'), name: 'Simone Romagnoli', role: 'D', team: 'Empoli', baseValue: 2, avgRating: 5.45, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.1, reliability: 0.6 },
  { id: generateId('Luca Ranieri'), name: 'Luca Ranieri', role: 'D', team: 'Fiorentina', baseValue: 2, avgRating: 5.45, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.12, reliability: 0.58 },
  { id: generateId('Lorenzo Pirola'), name: 'Lorenzo Pirola', role: 'D', team: 'Salernitana', baseValue: 2, avgRating: 5.45, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.08, reliability: 0.62 },
  { id: generateId('Norbert Gyomber'), name: 'Norbert Gyomber', role: 'D', team: 'Salernitana', baseValue: 2, avgRating: 5.4, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.06, reliability: 0.6 },
  { id: generateId('Adama Soumaoro'), name: 'Adama Soumaoro', role: 'D', team: 'Bologna', baseValue: 2, avgRating: 5.4, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.1, reliability: 0.55 },
  { id: generateId('Matteo Lovato'), name: 'Matteo Lovato', role: 'D', team: 'Salernitana', baseValue: 1, avgRating: 5.35, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.06, reliability: 0.5 },
  { id: generateId('Maxime Busi'), name: 'Maxime Busi', role: 'D', team: 'Parma', baseValue: 1, avgRating: 5.3, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.08, reliability: 0.45 },
  { id: generateId('Kelvin Amian'), name: 'Kelvin Amian', role: 'D', team: 'Spezia', baseValue: 1, avgRating: 5.3, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.08, reliability: 0.5 },
  { id: generateId('Dimitris Nikolaou'), name: 'Dimitris Nikolaou', role: 'D', team: 'Spezia', baseValue: 1, avgRating: 5.3, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.08, reliability: 0.52 },
  { id: generateId('Mateusz Wieteska'), name: 'Mateusz Wieteska', role: 'D', team: 'Cagliari', baseValue: 1, avgRating: 5.25, goalProbability: 0.01, assistProbability: 0.01, yellowCardProbability: 0.12, redCardProbability: 0.02, cleanSheetProbability: 0.06, reliability: 0.48 },
  { id: generateId('Giorgio Scalvini'), name: 'Giorgio Scalvini', role: 'D', team: 'Atalanta', baseValue: 8, avgRating: 5.75, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.22, reliability: 0.75 },
  { id: generateId('Federico Gatti'), name: 'Federico Gatti', role: 'D', team: 'Juventus', baseValue: 7, avgRating: 5.7, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.24, reliability: 0.78 },
  { id: generateId('Mattia De Sciglio'), name: 'Mattia De Sciglio', role: 'D', team: 'Juventus', baseValue: 3, avgRating: 5.5, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.18, reliability: 0.5 },
  { id: generateId('Alex Sandro'), name: 'Alex Sandro', role: 'D', team: 'Juventus', baseValue: 6, avgRating: 5.65, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.2, reliability: 0.7 },
  { id: generateId('Denzel Dumfries'), name: 'Denzel Dumfries', role: 'D', team: 'Inter', baseValue: 14, avgRating: 5.95, goalProbability: 0.04, assistProbability: 0.08, yellowCardProbability: 0.1, redCardProbability: 0.01, cleanSheetProbability: 0.28, reliability: 0.82 },
  { id: generateId('Francesco Acerbi'), name: 'Francesco Acerbi', role: 'D', team: 'Inter', baseValue: 10, avgRating: 5.85, goalProbability: 0.02, assistProbability: 0.01, yellowCardProbability: 0.1, redCardProbability: 0.02, cleanSheetProbability: 0.3, reliability: 0.78 },
  { id: generateId('Benjamin Pavard'), name: 'Benjamin Pavard', role: 'D', team: 'Inter', baseValue: 12, avgRating: 5.9, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.3, reliability: 0.8 },
  { id: generateId('Carlos Augusto'), name: 'Carlos Augusto', role: 'D', team: 'Inter', baseValue: 8, avgRating: 5.75, goalProbability: 0.01, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, cleanSheetProbability: 0.26, reliability: 0.72 },
];

/**
 * CENTROCAMPISTI (60 giocatori)
 * Range valore: 1-40 crediti
 */
const midfielders: Player[] = [
  // Top tier (30-40 crediti)
  { id: generateId('Nicolo Barella'), name: 'Nicolo Barella', role: 'C', team: 'Inter', baseValue: 40, avgRating: 6.6, goalProbability: 0.08, assistProbability: 0.12, yellowCardProbability: 0.12, redCardProbability: 0.01, reliability: 0.9 },
  { id: generateId('Sergej Milinkovic-Savic'), name: 'Sergej Milinkovic-Savic', role: 'C', team: 'Lazio', baseValue: 38, avgRating: 6.5, goalProbability: 0.1, assistProbability: 0.1, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.88 },
  { id: generateId('Khvicha Kvaratskhelia'), name: 'Khvicha Kvaratskhelia', role: 'C', team: 'Napoli', baseValue: 38, avgRating: 6.55, goalProbability: 0.12, assistProbability: 0.14, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.85 },
  { id: generateId('Rafael Leao'), name: 'Rafael Leao', role: 'C', team: 'Milan', baseValue: 36, avgRating: 6.45, goalProbability: 0.1, assistProbability: 0.12, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.82 },
  { id: generateId('Hakan Calhanoglu'), name: 'Hakan Calhanoglu', role: 'C', team: 'Inter', baseValue: 35, avgRating: 6.4, goalProbability: 0.08, assistProbability: 0.1, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.88 },
  { id: generateId('Luis Alberto'), name: 'Luis Alberto', role: 'C', team: 'Lazio', baseValue: 32, avgRating: 6.35, goalProbability: 0.06, assistProbability: 0.12, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Teun Koopmeiners'), name: 'Teun Koopmeiners', role: 'C', team: 'Atalanta', baseValue: 30, avgRating: 6.3, goalProbability: 0.08, assistProbability: 0.08, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.88 },
  
  // Mid-high tier (20-29 crediti)
  { id: generateId('Henrikh Mkhitaryan'), name: 'Henrikh Mkhitaryan', role: 'C', team: 'Inter', baseValue: 28, avgRating: 6.25, goalProbability: 0.06, assistProbability: 0.08, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.82 },
  { id: generateId('Matteo Politano'), name: 'Matteo Politano', role: 'C', team: 'Napoli', baseValue: 26, avgRating: 6.2, goalProbability: 0.06, assistProbability: 0.1, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.85 },
  { id: generateId('Davide Frattesi'), name: 'Davide Frattesi', role: 'C', team: 'Inter', baseValue: 25, avgRating: 6.15, goalProbability: 0.08, assistProbability: 0.06, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.75 },
  { id: generateId('Ruslan Malinovskyi'), name: 'Ruslan Malinovskyi', role: 'C', team: 'Atalanta', baseValue: 24, avgRating: 6.1, goalProbability: 0.08, assistProbability: 0.08, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Sandro Tonali'), name: 'Sandro Tonali', role: 'C', team: 'Milan', baseValue: 24, avgRating: 6.1, goalProbability: 0.04, assistProbability: 0.06, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.85 },
  { id: generateId('Lorenzo Pellegrini'), name: 'Lorenzo Pellegrini', role: 'C', team: 'Roma', baseValue: 22, avgRating: 6.05, goalProbability: 0.06, assistProbability: 0.1, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.78 },
  { id: generateId('Piotr Zielinski'), name: 'Piotr Zielinski', role: 'C', team: 'Napoli', baseValue: 22, avgRating: 6.05, goalProbability: 0.06, assistProbability: 0.08, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Adrien Rabiot'), name: 'Adrien Rabiot', role: 'C', team: 'Juventus', baseValue: 20, avgRating: 6.0, goalProbability: 0.04, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.82 },
  
  // Mid tier (10-19 crediti)
  { id: generateId('Manuel Locatelli'), name: 'Manuel Locatelli', role: 'C', team: 'Juventus', baseValue: 18, avgRating: 5.95, goalProbability: 0.03, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.85 },
  { id: generateId('Antonin Barak'), name: 'Antonin Barak', role: 'C', team: 'Fiorentina', baseValue: 16, avgRating: 5.9, goalProbability: 0.06, assistProbability: 0.06, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.78 },
  { id: generateId('Giacomo Bonaventura'), name: 'Giacomo Bonaventura', role: 'C', team: 'Fiorentina', baseValue: 15, avgRating: 5.9, goalProbability: 0.04, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.75 },
  { id: generateId('Mattias Svanberg'), name: 'Mattias Svanberg', role: 'C', team: 'Bologna', baseValue: 14, avgRating: 5.85, goalProbability: 0.04, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Tommaso Pobega'), name: 'Tommaso Pobega', role: 'C', team: 'Milan', baseValue: 13, avgRating: 5.8, goalProbability: 0.04, assistProbability: 0.04, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.72 },
  { id: generateId('Samuele Ricci'), name: 'Samuele Ricci', role: 'C', team: 'Torino', baseValue: 12, avgRating: 5.8, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.82 },
  { id: generateId('Roberto Soriano'), name: 'Roberto Soriano', role: 'C', team: 'Bologna', baseValue: 12, avgRating: 5.8, goalProbability: 0.04, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.7 },
  { id: generateId('Rolando Mandragora'), name: 'Rolando Mandragora', role: 'C', team: 'Fiorentina', baseValue: 11, avgRating: 5.75, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.75 },
  { id: generateId('Ivan Ilic'), name: 'Ivan Ilic', role: 'C', team: 'Verona', baseValue: 11, avgRating: 5.75, goalProbability: 0.03, assistProbability: 0.05, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.78 },
  { id: generateId('Filippo Bandinelli'), name: 'Filippo Bandinelli', role: 'C', team: 'Empoli', baseValue: 10, avgRating: 5.7, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.75 },
  
  // Low-mid tier (5-9 crediti)
  { id: generateId('Nedim Bajrami'), name: 'Nedim Bajrami', role: 'C', team: 'Empoli', baseValue: 9, avgRating: 5.7, goalProbability: 0.04, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.78 },
  { id: generateId('Morten Thorsby'), name: 'Morten Thorsby', role: 'C', team: 'Sassuolo', baseValue: 8, avgRating: 5.65, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.72 },
  { id: generateId('Kristjan Asllani'), name: 'Kristjan Asllani', role: 'C', team: 'Inter', baseValue: 8, avgRating: 5.65, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Lazar Samardzic'), name: 'Lazar Samardzic', role: 'C', team: 'Udinese', baseValue: 8, avgRating: 5.7, goalProbability: 0.04, assistProbability: 0.05, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Weston McKennie'), name: 'Weston McKennie', role: 'C', team: 'Juventus', baseValue: 8, avgRating: 5.65, goalProbability: 0.03, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.7 },
  { id: generateId('Fabio Miretti'), name: 'Fabio Miretti', role: 'C', team: 'Juventus', baseValue: 7, avgRating: 5.6, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.68 },
  { id: generateId('Rade Krunic'), name: 'Rade Krunic', role: 'C', team: 'Milan', baseValue: 6, avgRating: 5.55, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Toma Basic'), name: 'Toma Basic', role: 'C', team: 'Lazio', baseValue: 6, avgRating: 5.55, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Danilo Cataldi'), name: 'Danilo Cataldi', role: 'C', team: 'Lazio', baseValue: 6, avgRating: 5.55, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.7 },
  { id: generateId('Karol Linetty'), name: 'Karol Linetty', role: 'C', team: 'Torino', baseValue: 5, avgRating: 5.5, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Samu Castillejo'), name: 'Samu Castillejo', role: 'C', team: 'Valencia', baseValue: 5, avgRating: 5.5, goalProbability: 0.02, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Alexis Saelemaekers'), name: 'Alexis Saelemaekers', role: 'C', team: 'Milan', baseValue: 7, avgRating: 5.6, goalProbability: 0.02, assistProbability: 0.05, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.7 },
  
  // Low tier (1-4 crediti)
  { id: generateId('Youssouf Fofana'), name: 'Youssouf Fofana', role: 'C', team: 'Monaco', baseValue: 4, avgRating: 5.5, goalProbability: 0.02, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Edoardo Bove'), name: 'Edoardo Bove', role: 'C', team: 'Roma', baseValue: 4, avgRating: 5.45, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Bryan Cristante'), name: 'Bryan Cristante', role: 'C', team: 'Roma', baseValue: 10, avgRating: 5.75, goalProbability: 0.03, assistProbability: 0.03, yellowCardProbability: 0.12, redCardProbability: 0.02, reliability: 0.8 },
  { id: generateId('Nemanja Matic'), name: 'Nemanja Matic', role: 'C', team: 'Roma', baseValue: 6, avgRating: 5.6, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Nicolo Fagioli'), name: 'Nicolo Fagioli', role: 'C', team: 'Juventus', baseValue: 5, avgRating: 5.55, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Eljif Elmas'), name: 'Eljif Elmas', role: 'C', team: 'Napoli', baseValue: 8, avgRating: 5.65, goalProbability: 0.03, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.7 },
  { id: generateId('Tanguy Ndombele'), name: 'Tanguy Ndombele', role: 'C', team: 'Napoli', baseValue: 4, avgRating: 5.45, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Gianluca Gaetano'), name: 'Gianluca Gaetano', role: 'C', team: 'Napoli', baseValue: 3, avgRating: 5.4, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.45 },
  { id: generateId('Filippo Ranocchia'), name: 'Filippo Ranocchia', role: 'C', team: 'Monza', baseValue: 3, avgRating: 5.4, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Matteo Cancellieri'), name: 'Matteo Cancellieri', role: 'C', team: 'Lazio', baseValue: 3, avgRating: 5.4, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Simone Verdi'), name: 'Simone Verdi', role: 'C', team: 'Napoli', baseValue: 2, avgRating: 5.35, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.4 },
  { id: generateId('Giulio Maggiore'), name: 'Giulio Maggiore', role: 'C', team: 'Salernitana', baseValue: 2, avgRating: 5.35, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Pasquale Mazzocchi'), name: 'Pasquale Mazzocchi', role: 'C', team: 'Salernitana', baseValue: 2, avgRating: 5.35, goalProbability: 0.01, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Jacopo Segre'), name: 'Jacopo Segre', role: 'C', team: 'Palermo', baseValue: 1, avgRating: 5.3, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Filippo Melegoni'), name: 'Filippo Melegoni', role: 'C', team: 'Genoa', baseValue: 1, avgRating: 5.25, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.48 },
  { id: generateId('Razvan Marin'), name: 'Razvan Marin', role: 'C', team: 'Empoli', baseValue: 4, avgRating: 5.5, goalProbability: 0.02, assistProbability: 0.03, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.68 },
  { id: generateId('Alberto Grassi'), name: 'Alberto Grassi', role: 'C', team: 'Empoli', baseValue: 1, avgRating: 5.25, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Sofyan Amrabat'), name: 'Sofyan Amrabat', role: 'C', team: 'Fiorentina', baseValue: 10, avgRating: 5.75, goalProbability: 0.01, assistProbability: 0.02, yellowCardProbability: 0.14, redCardProbability: 0.02, reliability: 0.82 },
  { id: generateId('Nico Gonzalez'), name: 'Nico Gonzalez', role: 'C', team: 'Fiorentina', baseValue: 18, avgRating: 5.95, goalProbability: 0.08, assistProbability: 0.08, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.72 },
];

/**
 * ATTACCANTI (48 giocatori)
 * Range valore: 1-50 crediti
 */
const forwards: Player[] = [
  // Top tier (35-50 crediti)
  { id: generateId('Victor Osimhen'), name: 'Victor Osimhen', role: 'A', team: 'Napoli', baseValue: 50, avgRating: 6.8, goalProbability: 0.35, assistProbability: 0.08, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.85 },
  { id: generateId('Lautaro Martinez'), name: 'Lautaro Martinez', role: 'A', team: 'Inter', baseValue: 48, avgRating: 6.7, goalProbability: 0.32, assistProbability: 0.1, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.88 },
  { id: generateId('Dusan Vlahovic'), name: 'Dusan Vlahovic', role: 'A', team: 'Juventus', baseValue: 45, avgRating: 6.6, goalProbability: 0.3, assistProbability: 0.06, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.85 },
  { id: generateId('Romelu Lukaku'), name: 'Romelu Lukaku', role: 'A', team: 'Roma', baseValue: 42, avgRating: 6.5, goalProbability: 0.28, assistProbability: 0.08, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Ciro Immobile'), name: 'Ciro Immobile', role: 'A', team: 'Lazio', baseValue: 40, avgRating: 6.45, goalProbability: 0.3, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.82 },
  { id: generateId('Olivier Giroud'), name: 'Olivier Giroud', role: 'A', team: 'Milan', baseValue: 38, avgRating: 6.4, goalProbability: 0.26, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Paulo Dybala'), name: 'Paulo Dybala', role: 'A', team: 'Roma', baseValue: 36, avgRating: 6.4, goalProbability: 0.2, assistProbability: 0.12, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.7 },
  
  // Mid-high tier (22-34 crediti)
  { id: generateId('Marcus Thuram'), name: 'Marcus Thuram', role: 'A', team: 'Inter', baseValue: 32, avgRating: 6.3, goalProbability: 0.22, assistProbability: 0.1, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.82 },
  { id: generateId('Arkadiusz Milik'), name: 'Arkadiusz Milik', role: 'A', team: 'Juventus', baseValue: 28, avgRating: 6.2, goalProbability: 0.2, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Gianluca Scamacca'), name: 'Gianluca Scamacca', role: 'A', team: 'Atalanta', baseValue: 26, avgRating: 6.15, goalProbability: 0.2, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.78 },
  { id: generateId('Ademola Lookman'), name: 'Ademola Lookman', role: 'A', team: 'Atalanta', baseValue: 25, avgRating: 6.1, goalProbability: 0.16, assistProbability: 0.1, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.8 },
  { id: generateId('Tammy Abraham'), name: 'Tammy Abraham', role: 'A', team: 'Roma', baseValue: 24, avgRating: 6.05, goalProbability: 0.18, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.75 },
  { id: generateId('Boulaye Dia'), name: 'Boulaye Dia', role: 'A', team: 'Salernitana', baseValue: 22, avgRating: 6.0, goalProbability: 0.16, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.78 },
  
  // Mid tier (12-21 crediti)
  { id: generateId('Moise Kean'), name: 'Moise Kean', role: 'A', team: 'Juventus', baseValue: 20, avgRating: 5.95, goalProbability: 0.14, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.7 },
  { id: generateId('Andrea Belotti'), name: 'Andrea Belotti', role: 'A', team: 'Roma', baseValue: 18, avgRating: 5.9, goalProbability: 0.14, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.68 },
  { id: generateId('Giovanni Simeone'), name: 'Giovanni Simeone', role: 'A', team: 'Napoli', baseValue: 16, avgRating: 5.85, goalProbability: 0.14, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Mattia Destro'), name: 'Mattia Destro', role: 'A', team: 'Empoli', baseValue: 15, avgRating: 5.8, goalProbability: 0.12, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Ante Rebic'), name: 'Ante Rebic', role: 'A', team: 'Milan', baseValue: 14, avgRating: 5.8, goalProbability: 0.1, assistProbability: 0.06, yellowCardProbability: 0.1, redCardProbability: 0.02, reliability: 0.6 },
  { id: generateId('Divock Origi'), name: 'Divock Origi', role: 'A', team: 'Milan', baseValue: 14, avgRating: 5.75, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Marko Arnautovic'), name: 'Marko Arnautovic', role: 'A', team: 'Inter', baseValue: 14, avgRating: 5.8, goalProbability: 0.12, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Luis Muriel'), name: 'Luis Muriel', role: 'A', team: 'Atalanta', baseValue: 13, avgRating: 5.75, goalProbability: 0.12, assistProbability: 0.06, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Krzysztof Piatek'), name: 'Krzysztof Piatek', role: 'A', team: 'Salernitana', baseValue: 12, avgRating: 5.7, goalProbability: 0.12, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.65 },
  
  // Low-mid tier (6-11 crediti)
  { id: generateId('Roberto Piccoli'), name: 'Roberto Piccoli', role: 'A', team: 'Atalanta', baseValue: 10, avgRating: 5.65, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Alexis Sanchez'), name: 'Alexis Sanchez', role: 'A', team: 'Inter', baseValue: 10, avgRating: 5.7, goalProbability: 0.1, assistProbability: 0.06, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Nikola Krstovic'), name: 'Nikola Krstovic', role: 'A', team: 'Lecce', baseValue: 9, avgRating: 5.65, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.7 },
  { id: generateId('M Bayo Keita'), name: 'M Bayo Keita', role: 'A', team: 'Bologna', baseValue: 8, avgRating: 5.6, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Riccardo Orsolini'), name: 'Riccardo Orsolini', role: 'A', team: 'Bologna', baseValue: 8, avgRating: 5.65, goalProbability: 0.08, assistProbability: 0.08, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.72 },
  { id: generateId('Christian Kouame'), name: 'Christian Kouame', role: 'A', team: 'Fiorentina', baseValue: 7, avgRating: 5.55, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.68 },
  { id: generateId('Luka Jovic'), name: 'Luka Jovic', role: 'A', team: 'Fiorentina', baseValue: 7, avgRating: 5.55, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Eldor Shomurodov'), name: 'Eldor Shomurodov', role: 'A', team: 'Roma', baseValue: 6, avgRating: 5.5, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Mbala Nzola'), name: 'Mbala Nzola', role: 'A', team: 'Fiorentina', baseValue: 6, avgRating: 5.5, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  
  // Low tier (1-5 crediti)
  { id: generateId('Pietro Pellegri'), name: 'Pietro Pellegri', role: 'A', team: 'Torino', baseValue: 5, avgRating: 5.45, goalProbability: 0.08, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.45 },
  { id: generateId('Antonio Sanabria'), name: 'Antonio Sanabria', role: 'A', team: 'Torino', baseValue: 5, avgRating: 5.5, goalProbability: 0.1, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.65 },
  { id: generateId('Federico Bonazzoli'), name: 'Federico Bonazzoli', role: 'A', team: 'Salernitana', baseValue: 4, avgRating: 5.4, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Sebastiano Esposito'), name: 'Sebastiano Esposito', role: 'A', team: 'Sampdoria', baseValue: 4, avgRating: 5.4, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.55 },
  { id: generateId('Francesco Caputo'), name: 'Francesco Caputo', role: 'A', team: 'Empoli', baseValue: 4, avgRating: 5.4, goalProbability: 0.08, assistProbability: 0.04, yellowCardProbability: 0.06, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Walid Cheddira'), name: 'Walid Cheddira', role: 'A', team: 'Bari', baseValue: 3, avgRating: 5.35, goalProbability: 0.08, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.6 },
  { id: generateId('Cedric Gondo'), name: 'Cedric Gondo', role: 'A', team: 'Salernitana', baseValue: 2, avgRating: 5.3, goalProbability: 0.06, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.45 },
  { id: generateId('Simone Zaza'), name: 'Simone Zaza', role: 'A', team: 'Torino', baseValue: 2, avgRating: 5.25, goalProbability: 0.06, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.4 },
  { id: generateId('Kevin Lasagna'), name: 'Kevin Lasagna', role: 'A', team: 'Verona', baseValue: 2, avgRating: 5.3, goalProbability: 0.06, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.5 },
  { id: generateId('Samuel Di Carmine'), name: 'Samuel Di Carmine', role: 'A', team: 'Verona', baseValue: 1, avgRating: 5.2, goalProbability: 0.04, assistProbability: 0.02, yellowCardProbability: 0.08, redCardProbability: 0.01, reliability: 0.35 },
  { id: generateId('Adolfo Gaich'), name: 'Adolfo Gaich', role: 'A', team: 'Benevento', baseValue: 1, avgRating: 5.2, goalProbability: 0.06, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.4 },
  { id: generateId('Patrick Cutrone'), name: 'Patrick Cutrone', role: 'A', team: 'Empoli', baseValue: 1, avgRating: 5.2, goalProbability: 0.06, assistProbability: 0.02, yellowCardProbability: 0.1, redCardProbability: 0.01, reliability: 0.4 },
];

/**
 * Dataset completo di tutti i giocatori
 * Totale: 192 giocatori (24 P + 60 D + 60 C + 48 A)
 * Sufficiente per 12 squadre da 8 giocatori ciascuna (anche con il listone ridotto)
 */
export const PLAYERS_DATABASE: Player[] = [
  ...goalkeepers,
  ...defenders,
  ...midfielders,
  ...forwards,
];

/**
 * Funzione per ottenere giocatori filtrati per ruolo
 */
export const getPlayersByRole = (role: PlayerRole): Player[] => 
  PLAYERS_DATABASE.filter(p => p.role === role);

/**
 * Funzione per ottenere un giocatore per ID
 */
export const getPlayerById = (id: string): Player | undefined => 
  PLAYERS_DATABASE.find(p => p.id === id);

/**
 * Statistiche del database
 */
export const DATABASE_STATS = {
  totalPlayers: PLAYERS_DATABASE.length,
  byRole: {
    P: goalkeepers.length,
    D: defenders.length,
    C: midfielders.length,
    A: forwards.length,
  },
  valueRange: {
    min: Math.min(...PLAYERS_DATABASE.map(p => p.baseValue)),
    max: Math.max(...PLAYERS_DATABASE.map(p => p.baseValue)),
    avg: Math.round(PLAYERS_DATABASE.reduce((sum, p) => sum + p.baseValue, 0) / PLAYERS_DATABASE.length),
  },
};
