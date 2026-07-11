import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mentor/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/mentor/dashboard"!</div>
}
