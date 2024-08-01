#!/bin/sh
grep -o '"username":' followed.json | wc -l
