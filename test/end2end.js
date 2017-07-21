// test/end2end.js

var chakram = require('chakram'),
    expect = chakram.expect

var buildURL = function(uri) {
    // for some reason, path.join blows up chakram.get below
    return 'http://localhost:8080' + uri
}

describe("credential store", () => {
    beforeEach(() => {
        //chakram.startDebug()
    })
    
    it("should return list of credentials", function() {
        this.timeout(10000)  
        let response = chakram.get(buildURL('/credential/creds'))
        return expect(response).to.have.status(200)
    })
    it("should return 404 when bogus path used", function() {
        let response = chakram.get(buildURL('/credential/some/path'))
        return expect(response).to.have.status(404)
    })
    it("should return 404 when bad cred URI requested", function() {
        this.timeout(5000)
        let response = chakram.get(buildURL('/credential/creds/badcred'))
        return expect(response).to.have.status(404)
    })
    it("post should return location header, get should find record, delete should work", function() {
        this.timeout(30000)
        return chakram.post(buildURL('/credential/creds'), {
	       "type": "user",
	       "name": "test-user-1",
	       "data": {
		      "username": "test",
		      "password": "test"
	       }
        }).then((postResponse) => {
            expect(postResponse).to.have.status(201)
            let uri = postResponse.response.headers['location']
            return chakram.get(buildURL(uri))
        }).then((getResponse) => {
            expect(getResponse).to.have.status(200)
            return chakram.delete(buildURL(getResponse.body.links[0].href))            
        }).then((deleteResponse) => {
            expect(deleteResponse).to.have.status(204)
            return chakram.get(deleteResponse.url)
        }).then((getResponse) => {
            return expect(getResponse).to.have.status(404)
        })
    })
    it("filtering should work fetching credential list", function() {
        this.timeout(30000)
        
        var matchingURI
        var nonmatchingURI
        
        var matchingPost = chakram.post(buildURL('/credential/creds'), {
           "type": "user",
           "name": "test-user-2",
           "data": {
              "username": "test2",
              "password": "test2password"
           }
        })
        var nonmatchingPost = chakram.post(buildURL('/credential/creds'), {
           "type": "service",
           "name": "test-service-1",
           "data": {
              "username": "test1",
              "password": "test2password"
           }
        })
        
        return matchingPost.then((postResponse) => {
            expect(postResponse).to.have.status(201)
            matchingURI = postResponse.response.headers['location']
            return nonmatchingPost
        }).then((postResponse) => {
            expect(postResponse).to.have.status(201)
            nonmatchingURI = postResponse.response.headers['location']
            return chakram.get(buildURL('/credential/creds?type=user'))
        }).then((getResponse) => {
            expect(getResponse).to.have.status(200)
            expect(getResponse.body.itemCount).to.be.above(0)
            expect(getResponse.body.items.every((element, index, array) => {
                return element.type === 'user'
            })).to.be.true
            return chakram.get(buildURL(matchingURI))
        }).then((getResponse) => {
            expect(getResponse).to.have.status(200)
            expect(getResponse.body.name).to.equal('test-user-2')
            return chakram.delete(buildURL(matchingURI))
        }).then((delResponse) => {
            expect(delResponse).to.have.status(204)
            return chakram.get(buildURL(nonmatchingURI))
        }).then((getResponse) => {
            expect(getResponse).to.have.status(200)
            expect(getResponse.body.name).to.equal('test-service-1')
            return chakram.delete(buildURL(nonmatchingURI))
        }).then((delResponse) => {
            return expect(delResponse).to.have.status(204)
        })
    })
})