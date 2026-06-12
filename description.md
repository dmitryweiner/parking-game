# Parking game

## Description

User drives on a car and tries to find a parking slot close to the entrance.

## Game mechanics

Each time the user starts the game, a new game field is generated.
It consists parking lot filled randomly with other cars.

User needs to find an empty parking lot, not to break his car, and do it quickly (time is ticking).

When he found a right place, his score is calculated (accrding to time and distance to the exit).

User uses steering wheel to change the direction of the car, accelerator and breaks to change the velocity.

## Implementation

### Game field

It is zoomable and tooks all the device screen. All other UI parts (score, time, steering wheel, pedals) are placed
on top of game field, some of them are clickable.

Parking lots itself are marked by white lines.

### Cars

Ordinary cars (could be used emoji of car) with different colors.

### Steering wheel, pedals

Are shown only for mobile screen. Desktop users use keyboad.

## Technologies

- Language: TS
- Bundler: vite, builds to ./docs
- Unit tests: yes, first
- Physics, render: use any popular libraries which you want
