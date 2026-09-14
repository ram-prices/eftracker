#!/usr/bin/env perl
# Unwraps a saved Claude_Browser javascript_tool result file (JSON array with
# a double-JSON-encoded "text" field, produced when a JS eval's string result
# is too large to inline) into the plain text/JSON it represents.
#
# Usage: perl extract-js-result.pl <tool-result.txt> <output-file>
use strict;
use warnings;
use JSON::PP;

my ($in_path, $out_path) = @ARGV;
die "Usage: $0 <tool-result.txt> <output-file>\n" unless $in_path && $out_path;

open(my $fh, "<:raw", $in_path) or die "Cannot read $in_path: $!";
local $/;
my $raw = <$fh>;
close $fh;

my $jp_bytes = JSON::PP->new->utf8->allow_nonref;
my $jp_text  = JSON::PP->new->allow_nonref;

my $outer = $jp_bytes->decode($raw);
my $text_field = $outer->[0]{text};

# The JS result was returned as a JSON string (JSON.stringify(...)), so the
# extracted text field is itself JSON-encoded text one more level deep.
my $unwrapped = $jp_text->decode($text_field);

open(my $out, ">:encoding(UTF-8)", $out_path) or die "Cannot write $out_path: $!";
print $out $unwrapped;
close $out;

print "Wrote " . length($unwrapped) . " chars to $out_path\n";
