buster.testCase("navstack", {
    setUp: function () {
        this.target = document.createElement("div");
        this.n = new Navstack();
        this.n.target = this.target;
    },

    "page rendering lifecycle": {
        "creates default element if createElement is not defined": function () {
            var c = {};
            Navstack.renderPage(c);
            assert.defined(c.element);
            assert(c.element instanceof Element);
        },

        "calls createElement if defined": function () {
            var actualElement = document.createElement("div");
            var c = {
                createElement: function () {
                    this.element = actualElement;
                }
            };

            Navstack.renderPage(c);
            assert.same(c.element, actualElement);
        },

        "re-renders when already rendered": function () {
            var predefinedElement = document.createElement("div");
            var c = {
                element: predefinedElement
            }
            Navstack.renderPage(c);
            assert.same(c.element, predefinedElement);
        },

        "re-renders with createElement": function () {
            var actualElement = document.createElement("div");
            var c = {
                createElement: this.spy(function () {
                    this.element = actualElement;
                })
            };
            Navstack.renderPage(c);
            Navstack.renderPage(c);
            assert.calledOnce(c.createElement);
            assert.same(c.element, actualElement);
        }
    },

    "page chain": {
        setUp: function () {
            this.bazPage = {};

            this.barPage = {};
            this.barPage.route = this.stub();
            this.barPage.route.returns(this.bazPage);

            this.fooPage = {};
            this.fooPage.route = this.stub();
            this.fooPage.route.returns(this.barPage);

            this.n.rootPage = {};
            this.n.rootPage.route = this.stub();
            this.n.rootPage.route.returns(this.fooPage);
        },

        "navigation calls onnavigate callback": function () {
            this.n.onnavigate = this.stub();

            this.n.navigate("/foo");
            assert.calledOnce(this.n.onnavigate);
            assert.calledWithExactly(this.n.onnavigate, "/foo");

            this.n.navigate("/foo/bar/baz");
            assert.calledTwice(this.n.onnavigate);
            assert.calledWithExactly(this.n.onnavigate, "/foo/bar/baz");
        },

        "navigation prepares all items": function () {
            this.n.rootPage.prepare = function () {
                this.root = 123;
            }

            this.fooPage.prepare = function () {
                this.foo = 123;
            }

            this.barPage.prepare = function () {
                this.bar = 123;
            }

            this.n.navigate("/foo/bar");
            assert.equals(this.n.rootPage.root, 123);
            assert.equals(this.fooPage.foo, 123);
            assert.equals(this.barPage.bar, 123);
        },

        "navigation prepares all items with asynchronous prepare": function (done) {
            var self = this;

            this.n.rootPage.prepare = function (done) {
                this.root = 123;
                setTimeout(done, 1);
            }

            this.fooPage.prepare = function (done) {
                this.foo = 123;
                setTimeout(done, 1);
            }

            this.barPage.prepare = function (done) {
                this.bar = 123;
                setTimeout(done, 1);
            }

            this.n.onnavigate = done(function () {
                assert.equals(self.n.rootPage.root, 123);
                assert.equals(self.fooPage.foo, 123);
                assert.equals(self.barPage.bar, 123);
            });

            this.n.navigate("/foo/bar");
        },

        "navigation renders only last item in stack": function () {
            this.stub(Navstack, "renderPage");
            this.n.navigate("/foo/bar");

            assert.calledOnce(Navstack.renderPage);
            assert.same(Navstack.renderPage.getCall(0).args[0], this.barPage);
        },

        "navigating to root page renders it": function () {
            this.stub(Navstack, "renderPage");
            this.n.navigate("/");
            assert.calledOnce(Navstack.renderPage);
            assert.same(Navstack.renderPage.getCall(0).args[0], this.n.rootPage);
        },

        "navigating to root page prepares it": function () {
            this.n.rootPage.prepare = this.stub();
            this.n.navigate("/");
            assert.calledOnce(this.n.rootPage.prepare);
        },

        "navigating to root page calls onnavigate": function () {
            this.n.onnavigate = this.stub();
            this.n.navigate("/");
            assert.calledOnce(this.n.onnavigate);
            assert.calledWithExactly(this.n.onnavigate, "/");
        },

        "sequential steps": {
            setUp: function () {
                this.n.navigate("/foo");
            },

            "pushing one page calls onnavigate": function () {
                this.n.onnavigate = this.stub();
                this.n.pushPage("bar");
                assert.calledOnce(this.n.onnavigate);
                assert.calledWithExactly(this.n.onnavigate, "/foo/bar");
            },

            "pushing one page prepares it": function () {
                this.barPage.prepare = function () {
                    this.bar = "yup";
                }
                this.n.pushPage("bar");
                assert.equals(this.barPage.bar, "yup");
            },

            "pushing one page prepares asynchronously": function (done) {
                var self = this;
                this.barPage.prepare = function (done) {
                    this.bar = "yup";
                    setTimeout(done, 1);
                }
                this.n.onnavigate = done(function () {
                    assert.equals(self.barPage.bar, "yup");
                });
                this.n.pushPage("bar");
            },

            "pushing one page renders it": function () {
                this.stub(Navstack, "renderPage");
                this.n.pushPage("bar");

                assert.calledOnce(Navstack.renderPage);
                assert.same(Navstack.renderPage.getCall(0).args[0], this.barPage);
            },

            "pushing two pages prepares and renders both": function () {
                this.barPage.prepare = this.stub();
                this.bazPage.prepare = this.stub();
                this.stub(Navstack, "renderPage");
                this.n.onnavigate = this.stub();

                this.n.pushPage("bar");
                this.n.pushPage("baz");

                assert.calledOnce(this.barPage.prepare);
                assert.calledOnce(this.bazPage.prepare);
                assert.calledTwice(Navstack.renderPage);
                assert.same(Navstack.renderPage.getCall(0).args[0], this.barPage);
                assert.same(Navstack.renderPage.getCall(1).args[0], this.bazPage);
                assert.calledTwice(this.n.onnavigate);
                assert.equals(this.n.onnavigate.getCall(0).args[0], "/foo/bar");
                assert.equals(this.n.onnavigate.getCall(1).args[0], "/foo/bar/baz");
            },

            "popping one page calls onnavigate": function () {
                this.n.onnavigate = this.stub();
                this.n.popPage();
                assert.calledOnce(this.n.onnavigate);
                assert.calledWithExactly(this.n.onnavigate, "/");
            },

            "popping one page renders previous page": function () {
                this.stub(Navstack, "renderPage");
                this.n.popPage();
                assert.calledOnce(Navstack.renderPage);
                assert.same(Navstack.renderPage.getCall(0).args[0], this.n.rootPage);
            },

            "popping one page does not prepare previous page": function () {
                this.n.rootPage.prepare = this.stub();
                this.n.popPage();
                refute.called(this.n.rootPage.prepare);
            },

            "popping on root page does not render or prepare": function () {
                this.n.navigate("/");
                this.stub(Navstack, "renderPage");
                this.n.rootPage.prepare = this.stub();
                this.fooPage.prepare = this.stub();

                this.n.popPage();

                refute.called(Navstack.renderPage);
                refute.called(this.n.rootPage.prepare);
                refute.called(this.fooPage.prepare);
            },

            "popping twice renders prev and prev prev page": function () {
                this.n.navigate("/foo/bar/baz");
                this.stub(Navstack, "renderPage");
                this.barPage.prepare = this.stub();
                this.fooPage.prepare = this.stub();

                this.n.popPage();
                refute.called(this.barPage.prepare);
                refute.called(this.fooPage.prepare);
                assert.calledOnce(Navstack.renderPage);
                assert.same(Navstack.renderPage.getCall(0).args[0], this.barPage);

                this.n.popPage();
                refute.called(this.barPage.prepare);
                refute.called(this.fooPage.prepare);
                assert.calledTwice(Navstack.renderPage);
                assert.same(Navstack.renderPage.getCall(1).args[0], this.fooPage);
            }
        }
    }
});