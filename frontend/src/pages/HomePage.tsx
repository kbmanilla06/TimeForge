import { useAuth } from '../context/useAuth'
import { AttendanceWidget } from '../components/AttendanceWidget'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'

export function HomePage() {
  const { user, pictureUrl } = useAuth()

  if (!user) return null

  const description = user.department?.description?.trim()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Card className="p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={user.name} pictureUrl={pictureUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{user.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {user.department?.name ?? 'No department assigned'}
              {user.position ? ` · ${user.position}` : ''}
            </p>
          </div>
        </div>

        {user.department && (
          <div className="mt-6 border-t border-line pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              About {user.department.name}
            </h2>
            {description ? (
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink">
                {description.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                No description has been added for this department yet.
              </p>
            )}
          </div>
        )}
      </Card>

      <AttendanceWidget />
    </main>
  )
}
