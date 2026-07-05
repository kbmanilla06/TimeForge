<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body>
    @include('reports.partials.header', ['reportTitle' => 'Payroll Exceptions Report'])

    <table>
        <thead>
            <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Missing Rate</th>
                <th>Unapproved Submitted</th>
                <th>Rejected/Revision</th>
                <th>Attendance w/o Entries</th>
                <th>Entries w/o Submission</th>
                <th>Overtime Over Threshold</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['department'] ?? '—' }}</td>
                    <td>{{ $row['missing_hourly_rate'] ? 'Yes' : '—' }}</td>
                    <td>{{ $row['unapproved_submitted_count'] ?: '—' }}</td>
                    <td>{{ $row['rejected_or_revision_count'] ?: '—' }}</td>
                    <td>{{ $row['attendance_without_entries_days'] ?: '—' }}</td>
                    <td>{{ $row['entries_without_submission_days'] ?: '—' }}</td>
                    <td>{{ $row['overtime_over_threshold'] ? $row['overtime_hours'].' hrs' : '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8">No exceptions found for this period.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
