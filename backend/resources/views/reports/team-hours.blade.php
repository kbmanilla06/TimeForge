<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body>
    @include('reports.partials.header', ['reportTitle' => 'Team Hours Report'])

    <table>
        <thead>
            <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Approved Hrs</th>
                <th>Overtime Hrs</th>
                <th>Pending Hrs</th>
                <th>Rejected Hrs</th>
                <th>Attendance</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['department'] ?? '—' }}</td>
                    <td>{{ number_format($row['approved_minutes'] / 60, 2) }}</td>
                    <td>{{ number_format($row['overtime_minutes'] / 60, 2) }}</td>
                    <td>{{ number_format($row['pending_minutes'] / 60, 2) }}</td>
                    <td>{{ number_format($row['rejected_minutes'] / 60, 2) }}</td>
                    <td>{{ $row['attendance_days'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
