'use client'

import { PiCameraBold, PiHeartStraightBold, PiWineBold, PiConfettiBold } from 'react-icons/pi'

interface Props {
  type: string
}

export default function ScheduleIcon({ type }: Props) {
  const props = { size: 24 }
  switch (type) {
    case 'camera': return <PiCameraBold {...props} />
    case 'ceremony': return <PiHeartStraightBold {...props} />
    case 'dinner': return <PiWineBold {...props} />
    case 'party': return <PiConfettiBold {...props} />
    default: return <PiHeartStraightBold {...props} />
  }
}
