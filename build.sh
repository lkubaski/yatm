#!/usr/bin/env bash
set -e # The script will exit if any command returns a non zero status code

clean() {
  rm -rf ./output
  find ./src/js -name "*.js" -type f -delete
}

build() {
  tsc # the typescript compiler
  mkdir ./output
  cp ./manifest.json ./output
  cp -r ./src ./output/
  find ./output -name "*.ts" -type f -delete
  cd output
  zip -r "yatm.zip" ./* # you can use 'unzip -vl to inspect the zip file content
  cd ..
}

$1
