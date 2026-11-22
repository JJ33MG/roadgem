/** The kind of rental car a group needs: everyone seated, with room for their bags. */
export function carForGroup(people: number): { label: string; seats: number } {
  if (people <= 4) return { label: 'A compact car (4 to 5 seats)', seats: 5 };
  if (people === 5) return { label: 'A family car or estate (5 seats, big boot)', seats: 5 };
  if (people <= 7) return { label: 'A 7-seater', seats: 7 };
  return { label: 'A 9-seat minivan', seats: 9 };
}
