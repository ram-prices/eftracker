#!/usr/bin/env perl
# Recursively diffs two analysis-snapshot JSON files (as produced by the
# capture-snapshot.js browser script) and prints every path whose value
# differs, was added, or was removed. Exit code 1 if any diffs found.
#
# Usage: perl diff-snapshots.pl <before.json> <after.json>
use strict;
use warnings;
use JSON::PP;

my ($before_path, $after_path) = @ARGV;
die "Usage: $0 <before.json> <after.json>\n" unless $before_path && $after_path;

sub load_json {
    my ($path) = @_;
    open(my $fh, "<:encoding(UTF-8)", $path) or die "Cannot read $path: $!";
    local $/;
    my $raw = <$fh>;
    close $fh;
    return JSON::PP->new->decode($raw);
}

my $before = load_json($before_path);
my $after  = load_json($after_path);

my @diffs;

sub compare {
    my ($a, $b, $path) = @_;
    my $ra = ref $a;
    my $rb = ref $b;

    if ($ra ne $rb) {
        push @diffs, "$path: type changed (" . ($ra || 'scalar') . " -> " . ($rb || 'scalar') . ")";
        return;
    }

    if ($ra eq 'HASH') {
        my %keys = map { $_ => 1 } (keys %$a, keys %$b);
        for my $k (sort keys %keys) {
            if (!exists $a->{$k}) {
                push @diffs, "$path.$k: added";
            } elsif (!exists $b->{$k}) {
                push @diffs, "$path.$k: removed";
            } else {
                compare($a->{$k}, $b->{$k}, "$path.$k");
            }
        }
    } elsif ($ra eq 'ARRAY') {
        my $max = @$a > @$b ? scalar @$a : scalar @$b;
        if (@$a != @$b) {
            push @diffs, "$path: length changed (" . scalar(@$a) . " -> " . scalar(@$b) . ")";
        }
        for (my $i = 0; $i < $max; $i++) {
            if ($i >= @$a) {
                push @diffs, "$path\[$i]: added";
            } elsif ($i >= @$b) {
                push @diffs, "$path\[$i]: removed";
            } else {
                compare($a->[$i], $b->[$i], "$path\[$i]");
            }
        }
    } else {
        my $av = defined $a ? "$a" : "undef";
        my $bv = defined $b ? "$b" : "undef";
        if ($av ne $bv) {
            push @diffs, "$path: '$av' -> '$bv'";
        }
    }
}

compare($before, $after, "\$");

if (@diffs) {
    print "Found " . scalar(@diffs) . " difference(s):\n";
    print "  $_\n" for @diffs;
    exit 1;
} else {
    print "No differences. Snapshots match.\n";
    exit 0;
}
